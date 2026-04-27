# Đặc tả: CSV Student Data Sync (Cron Job)

## Mô tả

Tính năng này thực hiện việc đồng bộ hóa dữ liệu sinh viên định kỳ từ hệ thống cũ thông qua tệp tin CSV. Hệ thống sẽ tự động quét, kiểm tra tính hợp lệ, cập nhật thông tin sinh viên hiện có hoặc thêm mới sinh viên vào cơ sở dữ liệu UniHub mà không làm gián đoạn các phiên làm việc hiện tại của người dùng.

**Mục tiêu:**
- Import dữ liệu sinh viên từ CSV tự động mỗi đêm
- Xử lý file lỗi, dữ liệu trùng lặp
- Không làm gián đoạn hệ thống đang chạy
- Theo dõi lịch sử import với error logging chi tiết


---

## Luồng chính

### 1. File CSV Format

**Path:** `/mnt/csv-exports/students_YYYYMMDD.csv`

**Ví dụ:** `/mnt/csv-exports/students_20240601.csv`

**CSV Structure:**

```csv
student_id,email,full_name
SV001,nguyen.a@uni.edu,Nguyễn Văn A
SV002,tran.b@uni.edu,Trần Thị B
SV003,le.c@uni.edu,Lê Văn C
```

**Field Specifications:**

| Field | Type | Required | Max Length | Validation |
|-------|------|----------|------------|------------|
| student_id | String | ✅ | 20 | Unique, không có space |
| email | String | ✅ | 255 | Valid email format (RFC 5322) |
| full_name | String | ✅ | 255 | Không empty |

---

### 2. Cron Job Execution & Retry Strategy

Legacy System có thể gặp tình trạng chậm trễ trong việc tạo tệp hoặc lỗi network mounting. Web triển khai Resilience Strategy sử dụng Bull Queue (dựa trên Redis), dùng một persistent background worker với retry policy.

#### 2.1. Retry Policy
- Số lần thử tối đa: 3 (1 initial execution + 2 retries).

- Backoff Delay: 5 minutes (300,000 ms) fixed interval.

- Trigger: Nếu không tìm thấy tệp CSV hoặc tệp đang trong quá trình ghi (tệp trống), job sẽ báo thất bại và kích hoạt cơ chế thử lại.

#### 2.2. Technical Workflow
Phase 1: The Producer (Trigger)
The Cron Scheduler acts as a producer, adding a job to the queue at 3:00 AM.
```typescript
// Location: modules/csv-import/csv-import.cron.ts
@Cron('0 3 * * *', {
  name: 'csv-student-import-scheduler',
  timeZone: 'Asia/Ho_Chi_Minh'
})
async handleCron() {
  const today = format(new Date(), 'yyyyMMdd');
  
  // Add job to Bull Queue with Retry Config
  await this.csvQueue.add('process-csv-job', 
    { date: today }, 
    {
      attempts: 3, 
      backoff: {
        type: 'fixed',
        delay: 300000 // 5 minutes
      },
      removeOnComplete: true
    }
  );
  console.log(`[Cron] Enqueued import job for ${today}`);
}
```
Phase 2: The Consumer (Worker Logic)
The worker handles the actual file check and processing. Throwing an error here automatically triggers the retry mechanism defined in the Producer.

```typescript
// Location: modules/csv-import/csv-import.processor.ts
@Process('process-csv-job')
async handleImport(job: Job<{ date: string }>) {
  const filename = `students_${job.data.date}.csv`;
  const filepath = path.join('/mnt/csv-exports/', filename);

  // 1. FILE EXISTENCE CHECK (The Retry Trigger)
  if (!fs.existsSync(filepath)) {
    throw new Error(`[Attempt ${job.attemptsMade + 1}/3] File ${filename} not found.`);
  }

  const stats = fs.statSync(filepath);
  const importLog = await this.importLogRepo.create({ ... });

  // 2. FILE VALIDATION
  const stats = fs.statSync(filepath);
  if (stats.size === 0) {
    throw new Error(`[Attempt ${job.attemptsMade + 1}/3] File exists but is empty (possible write in progress).`);
  }

  // 3. LOG INITIALIZATION
  const importLog = await this.importLogRepo.create({
    filename,
    fileSize: stats.size,
    status: 'processing',
    startedAt: new Date()
  });
  await this.importLogRepo.save(importLog);

  try {
    // 4. CORE PROCESSING (Calls Section 3 Streaming Logic)
    await this.processCSVFile(filepath, importLog);

    // 5. UPDATE COMPLETION
    importLog.status = 'completed';
    importLog.completedAt = new Date();
    await this.importLogRepo.save(importLog);

    // 6. CLEANUP & NOTIFY
    await this.cleanupOldFiles(); // Delete files older than 30 days
    await this.sendSummaryEmail(importLog);
    
  } catch (error) {
    // Handle database or parsing errors
    importLog.status = 'failed';
    importLog.errors = [{ message: error.message }];
    await this.importLogRepo.save(importLog);
    
    // Re-throw so Bull Queue logs the failure
    throw error;
  }
}
```
---

### 3. CSV Processing (Streaming for Large Files)

**Strategy:** Stream processing để tránh tràn RAM với file lớn (100K+ rows)

**Flow:**

```typescript
async processCSVFile(filepath: string, importLog: ImportLog) {
  let totalRows = 0;
  let successRows = 0;
  let failedRows = 0;
  let skippedRows = 0;
  const errors: ImportError[] = [];
  
  const batch: StudentRow[] = [];
  const BATCH_SIZE = 1000;  // Process 1000 rows at a time
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filepath)
      .pipe(csv({
        skipEmptyLines: true,
        trim: true
      }))
      .on('data', async (row) => {
        totalRows++;
        
        // Validate row
        const validation = this.validateRow(row, totalRows);
        
        if (!validation.valid) {
          failedRows++;
          errors.push({
            row: totalRows,
            studentId: row.student_id,
            errors: validation.errors
          });
          return;
        }
        
        // Add to batch
        batch.push(row);
        
        // Process batch when full
        if (batch.length >= BATCH_SIZE) {
          try {
            const result = await this.processBatch([...batch]);
            successRows += result.success;
            failedRows += result.failed;
            skippedRows += result.skipped;
            errors.push(...result.errors);
            
            batch.length = 0;  // Clear batch
            
            console.log(`Processed ${totalRows} rows...`);
          } catch (error) {
            console.error('Batch processing error:', error);
            failedRows += batch.length;
          }
        }
      })
      .on('end', async () => {
        // Process remaining batch
        if (batch.length > 0) {
          const result = await this.processBatch(batch);
          successRows += result.success;
          failedRows += result.failed;
          skippedRows += result.skipped;
          errors.push(...result.errors);
        }
        
        // Update log
        importLog.totalRows = totalRows;
        importLog.successRows = successRows;
        importLog.failedRows = failedRows;
        importLog.skippedRows = skippedRows;
        importLog.errors = errors;
        
        await this.importLogRepo.save(importLog);
        
        console.log('[CSV Import] Completed:', {
          total: totalRows,
          success: successRows,
          failed: failedRows,
          skipped: skippedRows
        });
        
        resolve();
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}
```

---

### 4. Row Validation

**Validation Rules:**

```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

validateRow(row: any, rowNumber: number): ValidationResult {
  const errors: string[] = [];
  
  // Required fields
  if (!row.student_id || row.student_id.trim() === '') {
    errors.push('student_id is required');
  }
  
  if (!row.email || row.email.trim() === '') {
    errors.push('email is required');
  }
  
  if (!row.full_name || row.full_name.trim() === '') {
    errors.push('full_name is required');
  }
  
  // Format validation
  if (row.student_id && !/^[A-Z0-9]+$/.test(row.student_id)) {
    errors.push('student_id must contain only uppercase letters and numbers');
  }
  
  if (row.email && !this.isValidEmail(row.email)) {
    errors.push('email format is invalid');
  }
  
  // Length validation
  if (row.student_id && row.student_id.length > 20) {
    errors.push('student_id too long (max 20 characters)');
  }
  
  if (row.email && row.email.length > 255) {
    errors.push('email too long (max 255 characters)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

private isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
```

---

### 5. Batch Processing (Insert/Update)

**Strategy:** Upsert (Insert on conflict update)

**Flow:**

```typescript
async processBatch(batch: StudentRow[]): Promise<BatchResult> {
  let success = 0;
  let failed = 0;
  let skipped = 0;
  const errors: ImportError[] = [];
  
  await this.dataSource.transaction(async (manager) => {
    for (const row of batch) {
      try {
        // Check if student exists
        const existing = await manager.findOne(User, {
          where: { studentId: row.student_id }
        });
        
        if (existing) {
          // UPDATE existing student
          // Only update email and full_name, keep password_hash intact
          
          const hasChanges = 
            existing.email !== row.email ||
            existing.fullName !== row.full_name;
          
          if (!hasChanges) {
            skipped++;
            continue;  // No changes, skip
          }
          
          existing.email = row.email;
          existing.fullName = row.full_name;
          existing.faculty = row.faculty || existing.faculty;
          existing.year = row.year ? parseInt(row.year) : existing.year;
          existing.updatedAt = new Date();
          
          await manager.save(existing);
          success++;
          
        } else {
          // INSERT new student
          const user = manager.create(User, {
            studentId: row.student_id,
            email: row.email,
            fullName: row.full_name,
            faculty: row.faculty,
            year: row.year ? parseInt(row.year) : null,
            role: 'student',
            // Password will be set when student registers
            passwordHash: null
          });
          
          await manager.save(user);
          success++;
        }
        
      } catch (error) {
        failed++;
        errors.push({
          studentId: row.student_id,
          errors: [error.message]
        });
      }
    }
  });
  
  return { success, failed, skipped, errors };
}
```

**Database Upsert (Alternative - PostgreSQL native):**

```sql
-- More efficient for large batches
INSERT INTO users (student_id, email, full_name, faculty, year, role, updated_at)
VALUES 
  ('SV001', 'nguyen.a@uni.edu', 'Nguyễn Văn A', 'student', NOW()),
  ('SV002', 'tran.b@uni.edu', 'Trần Thị B', 'student', NOW())
ON CONFLICT (student_id) 
DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW()
WHERE 
  users.email != EXCLUDED.email OR
  users.full_name != EXCLUDED.full_name;  -- Only update if changed
```

---

### 6. Error Logging

**Database Schema:**

```sql
CREATE TABLE student_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_size BIGINT,  -- Bytes
  total_rows INTEGER DEFAULT 0,
  success_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  skipped_rows INTEGER DEFAULT 0,
  errors JSONB,  -- Array of error objects
  status VARCHAR(20) CHECK (status IN ('processing', 'completed', 'failed')),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_imports_filename ON student_imports(filename);
CREATE INDEX idx_imports_status ON student_imports(status);
CREATE INDEX idx_imports_date ON student_imports(started_at);
```

**Error JSON Structure:**

```json
{
  "errors": [
    {
      "row": 5,
      "studentId": "SV005",
      "errors": [
        "email format is invalid",
        "student_id too long (max 20 characters)"
      ]
    },
    {
      "row": 127,
      "studentId": "SV127",
      "errors": [
        "email is required"
      ]
    }
  ]
}
```

---

### 7. Admin Summary Email

**Trigger:** Sau khi import hoàn tất

**Email Template:**

```html
<!-- emails/csv-import-summary.hbs -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
    .stats { display: flex; justify-content: space-around; margin: 20px 0; }
    .stat { text-align: center; }
    .stat-number { font-size: 32px; font-weight: bold; }
    .stat-label { color: #6b7280; }
    .success { color: #10b981; }
    .failed { color: #ef4444; }
    .skipped { color: #f59e0b; }
    .error-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    .error-table th, .error-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    .error-table th { background: #f3f4f6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 CSV Import Summary</h1>
      <p>{{filename}}</p>
    </div>
    
    <div class="content">
      <p><strong>Import Time:</strong> {{formatDate startedAt}}</p>
      <p><strong>Duration:</strong> {{duration}} seconds</p>
      <p><strong>File Size:</strong> {{formatFileSize fileSize}}</p>
      
      <div class="stats">
        <div class="stat">
          <div class="stat-number">{{totalRows}}</div>
          <div class="stat-label">Total Rows</div>
        </div>
        
        <div class="stat">
          <div class="stat-number success">{{successRows}}</div>
          <div class="stat-label">Success</div>
        </div>
        
        <div class="stat">
          <div class="stat-number skipped">{{skippedRows}}</div>
          <div class="stat-label">Skipped</div>
        </div>
        
        <div class="stat">
          <div class="stat-number failed">{{failedRows}}</div>
          <div class="stat-label">Failed</div>
        </div>
      </div>
      
      {{#if errors}}
      <h3>Errors (First 20)</h3>
      <table class="error-table">
        <thead>
          <tr>
            <th>Row</th>
            <th>Student ID</th>
            <th>Errors</th>
          </tr>
        </thead>
        <tbody>
          {{#each errors}}
          <tr>
            <td>{{this.row}}</td>
            <td>{{this.studentId}}</td>
            <td>{{join this.errors ", "}}</td>
          </tr>
          {{/each}}
        </tbody>
      </table>
      
      {{#if hasMoreErrors}}
      <p style="color: #6b7280; font-style: italic;">
        ... and {{remainingErrors}} more errors. 
        <a href="{{adminUrl}}/imports/{{importId}}">View full log</a>
      </p>
      {{/if}}
      {{/if}}
      
      <div style="margin-top: 30px; padding: 15px; background: #f3f4f6; border-radius: 6px;">
        <p style="margin: 0;">
          <strong>Next Steps:</strong>
        </p>
        <ul>
          <li>Review failed rows and fix data in source system</li>
          <li>Skipped rows had no changes (already up-to-date)</li>
          <li>New students can now register with their Student ID</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>
```

**Send Email:**

```typescript
async sendSummaryEmail(importLog: ImportLog) {
  const duration = Math.round(
    (importLog.completedAt.getTime() - importLog.startedAt.getTime()) / 1000
  );
  
  const errors = importLog.errors.slice(0, 20);  // First 20 errors
  const hasMoreErrors = importLog.errors.length > 20;
  const remainingErrors = importLog.errors.length - 20;
  
  await this.mailService.send({
    to: process.env.ADMIN_EMAIL,
    subject: `CSV Import Summary: ${importLog.filename}`,
    template: 'emails/csv-import-summary.hbs',
    context: {
      filename: importLog.filename,
      startedAt: importLog.startedAt,
      duration,
      fileSize: importLog.fileSize,
      totalRows: importLog.totalRows,
      successRows: importLog.successRows,
      failedRows: importLog.failedRows,
      skippedRows: importLog.skippedRows,
      errors,
      hasMoreErrors,
      remainingErrors,
      importId: importLog.id,
      adminUrl: process.env.APP_URL
    }
  });
}
```

---

### 8. Admin Dashboard (View Import History)

**API Endpoint:**

```typescript
// GET /admin/imports
@Get('imports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organizer')
async getImportHistory(
  @Query() query: GetImportsDto
) {
  const imports = await this.importLogRepo.find({
    order: { startedAt: 'DESC' },
    take: query.limit || 20,
    skip: query.offset || 0
  });
  
  return {
    data: imports,
    total: await this.importLogRepo.count()
  };
}

// GET /admin/imports/:id
@Get('imports/:id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organizer')
async getImportDetail(@Param('id') id: string) {
  const importLog = await this.importLogRepo.findOne({ where: { id } });
  
  if (!importLog) {
    throw new NotFoundException();
  }
  
  return importLog;
}
```

**Frontend Component:**

```typescript
// pages/admin/imports.tsx
export default function ImportsPage() {
  const { data } = useQuery({
    queryKey: ['imports'],
    queryFn: () => api.getImports()
  });
  
  return (
    <div>
      <h1>CSV Import History</h1>
      
      <table>
        <thead>
          <tr>
            <th>Filename</th>
            <th>Date</th>
            <th>Total</th>
            <th>Success</th>
            <th>Failed</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data?.data.map(importLog => (
            <tr key={importLog.id}>
              <td>{importLog.filename}</td>
              <td>{format(importLog.startedAt, 'PPp')}</td>
              <td>{importLog.totalRows}</td>
              <td className="text-green-600">{importLog.successRows}</td>
              <td className="text-red-600">{importLog.failedRows}</td>
              <td>
                <Badge color={importLog.status === 'completed' ? 'green' : 'yellow'}>
                  {importLog.status}
                </Badge>
              </td>
              <td>
                <Link href={`/admin/imports/${importLog.id}`}>
                  View Details
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## Kịch bản lỗi

### 1. File không tồn tại

**Trigger:** CSV file không được export từ hệ thống cũ

**Flow:**
```
1. Cron job check file → Not found

2. Log warning:
   console.warn(`CSV file not found: students_20240601.csv`);

3. Email admin:
   Subject: "⚠️ CSV Import Skipped - File Not Found"
   Body: "Expected file students_20240601.csv not found in /mnt/csv-exports/"

4. Không tạo import log record

5. Hệ thống vẫn hoạt động bình thường (students hiện tại không bị ảnh hưởng)
```

---

### 2. File CSV malformed (sai format)

**Trigger:** CSV thiếu header hoặc sai delimiter

**Flow:**
```
1. CSV parser throw error:
   "Error: Invalid CSV format at line 1"

2. Catch error:
   importLog.status = 'failed';
   importLog.errors = [{ error: 'Invalid CSV format' }];
   await this.importLogRepo.save(importLog);

3. Email admin với error details

4. Không update bất kỳ student nào
```

---

### 3. Duplicate student_id trong CSV

**Trigger:** 2 rows có cùng student_id

**Flow:**
```
Row 10: SV001, nguyen.a@uni.edu, Nguyễn Văn A
Row 50: SV001, nguyen.b@uni.edu, Nguyễn Văn B  // Duplicate!

1. Process row 10 → Insert/Update OK

2. Process row 50:
   - Query existing: Found SV001
   - Compare: Email khác nhau (nguyen.a vs nguyen.b)
   - Decision: Keep existing (row 10), skip row 50
   
3. Log conflict:
   errors.push({
     row: 50,
     studentId: 'SV001',
     errors: ['Duplicate student_id with different email - kept first occurrence']
   });
   
   skippedRows++;
```

**Mitigation:**
- Hệ thống cũ phải đảm bảo CSV không có duplicate
- Hoặc thêm logic: Last row wins (update bằng row cuối cùng)

---

### 4. Database connection lost mid-import

**Trigger:** PostgreSQL restart, network issue

**Flow:**
```
1. Transaction throw error:
   "Connection terminated unexpectedly"

2. Rollback current batch (1000 rows)

3. Update import log:
   importLog.status = 'failed';
   importLog.errors = [{ error: 'Database connection lost at row 5000' }];

4. Email admin:
   "CSV import failed after processing 4000 rows.
    Transaction rolled back. Please retry import."

5. Next day cron job sẽ retry với file mới
```

---

### 5. File quá lớn (>100MB, 500K rows)

**Trigger:** Hệ thống cũ export file lớn bất thường

**Flow:**
```
1. Check file size:
   if (fileSizeMB > 100) {
     console.warn(`Large file detected: ${fileSizeMB} MB`);
   }

2. Vẫn xử lý nhưng:
   - Log warning
   - Stream processing (không load toàn bộ vào RAM)
   - Batch size nhỏ hơn: 500 rows thay vì 1000

3. Monitor memory usage:
   if (process.memoryUsage().heapUsed > 1GB) {
     console.warn('High memory usage during import');
   }

4. Email admin khi hoàn thành:
   "Large CSV import completed: 500,000 rows in 15 minutes"
```

---

### 6. Email trùng nhưng student_id khác

**Trigger:** 2 sinh viên khác nhau có cùng email

**Flow:**
```
Row 10: SV001, duplicate@uni.edu, Student A
Row 20: SV002, duplicate@uni.edu, Student B

1. Process row 10 → Insert OK

2. Process row 20 → Database constraint error:
   UNIQUE constraint failed: users.email

3. Log error:
   errors.push({
     row: 20,
     studentId: 'SV002',
     errors: ['Email already exists for another student (SV001)']
   });
   
   failedRows++;

4. Email admin highlight conflict để resolve manual
```
### 7. File missing sau 3 lượt attempts
Trigger: Sau khi Retry đủ 3 lần (tổng cộng ~15 phút) mà vẫn không tìm thấy file.

Flow:

- Bull Queue đánh dấu Job là FAILED vĩnh viễn.

- Listener OnQueueFailed bắt sự kiện và ghi nhận lỗi vào hệ thống giám sát.

- Email thông báo mức độ Khẩn cấp (Critical Alert) được gửi tới Admin: "Hệ thống Legacy không cung cấp dữ liệu đúng hạn, quy trình đồng bộ ngày YYYY-MM-DD bị hủy bỏ."
---

## Ràng buộc

### Business Rules

| Ràng buộc | Giá trị |
|-----------|---------|
| Cron schedule | 3:00 AM daily (Asia/Ho_Chi_Minh) |
| File retention | 30 days (auto cleanup old CSV files) |
| Import log retention | 90 days |
| Max file size | 50 MB (warning), 100 MB (hard limit) |
| Batch size | 1000 rows |
| Max retry on error | 3 (automatic retry next day) |

### Performance

| Ràng buộc | Giá trị |
|-----------|---------|
| Processing speed | ~5000 rows/minute |
| Max import time | 30 minutes |
| Transaction timeout | 60 seconds per batch |
| Memory usage | < 500 MB |

### Data Integrity

- **student_id uniqueness:** Enforced by DB unique constraint
- **email uniqueness:** Enforced by DB unique constraint
- **Transaction atomicity:** Each batch is atomic (all or nothing)
- **Existing data preservation:** Password hash never overwritten

---

## Tiêu chí chấp nhận

### Functional Tests

- [ ] **TC-CSV-001:** Import 1000 valid rows → All success
- [ ] **TC-CSV-002:** Import với 10 invalid rows → 990 success, 10 failed with errors logged
- [ ] **TC-CSV-003:** File không tồn tại → Warning email, không crash
- [ ] **TC-CSV-004:** CSV malformed → Failed status, email admin
- [ ] **TC-CSV-005:** Duplicate student_id trong CSV → Chỉ insert/update lần đầu
- [ ] **TC-CSV-006:** Update existing student → Email và full_name updated, password intact
- [ ] **TC-CSV-007:** Admin xem import history → Hiển thị đầy đủ logs
- [ ] **TC-CSV-008:** Admin xem import detail → Hiển thị errors chi tiết

### Performance Tests

- [ ] **TC-PERF-001:** Import 10,000 rows → < 2 minutes
- [ ] **TC-PERF-002:** Import 100,000 rows → < 20 minutes
- [ ] **TC-PERF-003:** Memory usage < 500 MB during import

### Reliability Tests

- [ ] **TC-REL-001:** Database down mid-import → Rollback, log error
- [ ] **TC-REL-002:** Import chạy hàng ngày → Không duplicate data
- [ ] **TC-REL-003:** File lỗi → Không ảnh hưởng students hiện tại

---

## Implementation Notes

### Cron Job Setup (NestJS)

```typescript
// csv-import.service.ts
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CsvImportService {
  @Cron('0 3 * * *', {
    name: 'csv-student-import',
    timeZone: 'Asia/Ho_Chi_Minh'
  })
  async handleCron() {
    console.log('[Cron] CSV Import started at', new Date());
    
    try {
      await this.processImport();
    } catch (error) {
      console.error('[Cron] Import failed:', error);
      await this.notificationService.notifyAdmin({
        type: 'csv-import-failed',
        error: error.message
      });
    }
  }
  
  // Can also trigger manually
  async processImport() {
    // Implementation ở trên
  }
}
```

### Module Registration

```typescript
// app.module.ts
@Module({
  imports: [
    ScheduleModule.forRoot(),  // Enable cron
    // ...
  ],
  providers: [CsvImportService]
})
export class AppModule {}
```

### Manual Trigger (Admin Endpoint)

```typescript
// admin.controller.ts
@Post('imports/trigger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('organizer')
async triggerImport() {
  // Manual trigger cho testing hoặc emergency import
  await this.csvImportService.processImport();
  
  return { message: 'Import triggered successfully' };
}
```

---

## Dependencies

- `@nestjs/schedule` - Cron job support
- `csv-parser` - Streaming CSV parser
- `fs` - File system operations
- `date-fns` - Date formatting
