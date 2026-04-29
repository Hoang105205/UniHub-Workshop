-- ============================================================
-- UniHub Workshop - Seed Data
-- ============================================================
-- Password hash cho 'password123': $2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S
-- (Sử dụng bcrypt với salt rounds = 10)
-- ============================================================

BEGIN;

-- ============================================================
-- 1. USERS (Total: 153 users)
-- ============================================================

-- 1.1. Admin Users (3 users với password)
INSERT INTO users (id, student_id, email, password_hash, full_name, user_role, created_at, updated_at) VALUES
('11a054bc-fb78-4520-81b1-745fea23ae37', NULL, 'admin@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Nguyễn Văn Admin', 'admin', NOW(), NOW()),
('1ecf63fd-a56a-4b7c-86f0-782653bb77de', NULL, 'organizer1@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Trần Thị Hương', 'admin', NOW(), NOW()),
('d98ff272-fed6-46b7-98ab-121c595de505', NULL, 'organizer2@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Lê Văn Minh', 'admin', NOW(), NOW());

-- 1.2. Staff Users (5 users với password)
INSERT INTO users (id, student_id, email, password_hash, full_name, user_role, created_at, updated_at) VALUES
('7e713240-9056-423d-a861-4028fe4bee7e', NULL, 'staff1@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Phạm Thị Lan', 'staff', NOW(), NOW()),
('1c85abc7-fd01-4605-a558-e4f83eb08811', NULL, 'staff2@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Hoàng Văn Nam', 'staff', NOW(), NOW()),
('45b40255-977f-4390-a4b4-c4611e362e25', NULL, 'staff3@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Vũ Thị Mai', 'staff', NOW(), NOW()),
('7780a627-1f61-4034-9f77-7a2dbbdac38b', NULL, 'staff4@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Đặng Văn Tú', 'staff', NOW(), NOW()),
('4f0019f6-a920-4370-9e79-9d9bc3dd25eb', NULL, 'staff5@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Bùi Thị Hoa', 'staff', NOW(), NOW());

-- 1.3. Student Users - Đã đăng ký (15 students với password)
INSERT INTO users (id, student_id, email, password_hash, full_name, user_role, created_at, updated_at) VALUES
('8318861a-db3d-49b3-a156-7113a50f6390', 'SV001', 'nguyen.van.a@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Nguyễn Văn A', 'student', NOW(), NOW()),
('8cd7425e-d2bb-4113-a2fb-b131cbdc1b09', 'SV002', 'tran.thi.b@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Trần Thị B', 'student', NOW(), NOW()),
('066c3732-20dd-4231-bff8-c8f62fc6c42c', 'SV003', 'le.van.c@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Lê Văn C', 'student', NOW(), NOW()),
('c7dfbecb-7e25-4240-a1ca-58438ab77719', 'SV004', 'pham.thi.d@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Phạm Thị D', 'student', NOW(), NOW()),
('9c64fcad-4f22-42d4-89cc-4306828757ce', 'SV005', 'hoang.van.e@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Hoàng Văn E', 'student', NOW(), NOW()),
('f43cd356-c10c-4ca3-a20d-07ddb0225afd', 'SV006', 'vu.thi.f@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Vũ Thị F', 'student', NOW(), NOW()),
('aab65aca-4bb3-46fd-a1a9-6b4dff60ca6c', 'SV007', 'dang.van.g@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Đặng Văn G', 'student', NOW(), NOW()),
('4fba29ac-a5d3-414b-8a37-e123afbe2496', 'SV008', 'bui.thi.h@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Bùi Thị H', 'student', NOW(), NOW()),
('1d162d19-4eb7-4d94-9035-a99eb1549b8a', 'SV009', 'do.van.i@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Đỗ Văn I', 'student', NOW(), NOW()),
('9f5fcf6a-dbbf-4824-bfa8-6a924e99c1bf', 'SV010', 'duong.thi.j@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Dương Thị J', 'student', NOW(), NOW()),
('2cb1a036-29ad-4f63-b8f7-79493720b20b', 'SV011', 'ngo.van.k@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Ngô Văn K', 'student', NOW(), NOW()),
('c007bdef-1ca5-4bcc-8de9-b204e60d0256', 'SV012', 'ly.thi.l@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Lý Thị L', 'student', NOW(), NOW()),
('3c0236c5-1b60-4374-9f0a-521c2b096fd9', 'SV013', 'mai.van.m@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Mai Văn M', 'student', NOW(), NOW()),
('7bd9ff84-3913-41f4-8c53-f0356e4db446', 'SV014', 'cao.thi.n@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Cao Thị N', 'student', NOW(), NOW()),
('e59a2ef7-f3d7-4c3b-9019-abf3b2c8ba02', 'SV015', 'trinh.van.o@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Trịnh Văn O', 'student', NOW(), NOW());

-- 1.4. Student Users - Chưa đăng ký (130 students KHÔNG có password - giả lập sync từ CSV)
-- Sử dụng generate_series để tạo 130 students từ SV016 đến SV145
INSERT INTO users (id, student_id, email, password_hash, full_name, user_role, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'SV' || LPAD(i::TEXT, 3, '0'),
  'student' || i || '@student.edu.vn',
  NULL,  -- Chưa có password (chưa đăng ký)
  CASE 
    WHEN i % 5 = 0 THEN 'Nguyễn '
    WHEN i % 5 = 1 THEN 'Trần '
    WHEN i % 5 = 2 THEN 'Lê '
    WHEN i % 5 = 3 THEN 'Phạm '
    ELSE 'Hoàng '
  END ||
  CASE 
    WHEN i % 2 = 0 THEN 'Văn '
    ELSE 'Thị '
  END ||
  chr(65 + (i % 26)),
  'student',
  NOW(),
  NOW()
FROM generate_series(16, 145) AS i;

-- ============================================================
-- 2. WORKSHOPS (Total: 40 workshops - Mix giữa free và paid)
-- ============================================================
-- Workshops từ 15-30 May 2026

INSERT INTO workshops (id, title, speaker, room, capacity, registered_count, price, start_time, end_time, detail, created_at, updated_at) VALUES
-- Week 1: 15-19 May 2026 (8 workshops)
('17cfebe3-41e6-489e-9c8a-2c763056b7b9', 'NestJS Backend Development từ A-Z', 'Nguyễn Minh Tuấn', 'A.101', 60, 45, 0, '2026-05-15 08:00:00', '2026-05-15 11:00:00', 'Workshop giới thiệu NestJS framework, từ cơ bản đến nâng cao. Học viên sẽ được thực hành xây dựng RESTful API với TypeORM, JWT authentication và testing.', NOW(), NOW()),
('0d167d0f-091f-4f22-addd-50376874aaa5', 'React Best Practices 2026', 'Trần Thị Hương', 'A.102', 59, 38, 50000, '2026-05-15 13:00:00', '2026-05-15 16:00:00', 'Tìm hiểu các design patterns trong React như Compound Components, Render Props, Higher-Order Components. Thực hành với hooks và performance optimization.', NOW(), NOW()),
('24d8bad8-0f67-4a47-b80a-418051e0d946', 'Docker & Kubernetes cho Developers', 'Lê Văn Minh', 'B.201', 64, 52, 100000, '2026-05-16 08:00:00', '2026-05-16 12:00:00', 'Workshop thực hành containerization với Docker và orchestration với Kubernetes. Học viên sẽ deploy một ứng dụng microservices hoàn chỉnh.', NOW(), NOW()),
('444de0c3-91d3-4eec-bed3-efc2ffcd92f1', 'UI/UX Design Thinking', 'Phạm Thị Lan', 'C.301', 50, 30, 0, '2026-05-16 13:00:00', '2026-05-16 16:00:00', 'Khóa học về quy trình thiết kế sản phẩm từ nghiên cứu người dùng, wireframing, prototyping đến user testing. Sử dụng Figma để thực hành.', NOW(), NOW()),
('4a4d4be0-271b-4acf-ab8a-26ce8267e015', 'PostgreSQL Performance Tuning', 'Hoàng Văn Nam', 'A.103', 58, 42, 75000, '2026-05-17 08:00:00', '2026-05-17 11:00:00', 'Tối ưu hóa database với indexing strategies, query optimization, connection pooling và partitioning. Hands-on với database thực tế.', NOW(), NOW()),
('6e4b8cc0-246a-4c85-ad29-fe9e11db8e81', 'GraphQL vs REST API', 'Vũ Thị Mai', 'B.202', 63, 35, 0, '2026-05-17 13:00:00', '2026-05-17 16:00:00', 'So sánh GraphQL và REST API, khi nào nên dùng cái gì. Xây dựng GraphQL server với Apollo và client với React Query.', NOW(), NOW()),
('19c40f55-bb31-4b8f-8404-12b4ff2ecc6c', 'Microservices Architecture Patterns', 'Đặng Văn Tú', 'A.104', 60, 48, 120000, '2026-05-18 08:00:00', '2026-05-18 12:00:00', 'Thiết kế hệ thống microservices với API Gateway, Service Discovery, Circuit Breaker patterns. Case study từ các hệ thống thực tế.', NOW(), NOW()),
('8e940259-f28e-4e72-8227-671730a3d51c', 'Git Advanced Workflows', 'Bùi Thị Hoa', 'C.302', 48, 25, 0, '2026-05-18 13:00:00', '2026-05-18 16:00:00', 'Nắm vững Git branching strategies (Git Flow, GitHub Flow), rebase vs merge, cherry-pick, và cách resolve conflicts phức tạp.', NOW(), NOW()),

-- Week 2: 20-24 May 2026 (8 workshops)
('59db978b-ed08-407a-9383-b719b9fa22e7', 'Next.js 14 App Router Deep Dive', 'Nguyễn Văn A', 'A.101', 59, 40, 80000, '2026-05-20 08:00:00', '2026-05-20 11:00:00', 'Khám phá Next.js 14 với App Router, Server Components, Server Actions, streaming và Suspense. Build một ứng dụng e-commerce.', NOW(), NOW()),
('7959777f-986d-4c4e-9f4e-85d8f9221a17', 'TypeScript Tips & Tricks', 'Trần Thị B', 'A.102', 60, 33, 0, '2026-05-20 13:00:00', '2026-05-20 16:00:00', 'Advanced TypeScript features: Generics, Utility Types, Conditional Types, Template Literal Types. Áp dụng vào dự án thực tế.', NOW(), NOW()),
('4eef9eae-17a2-41e4-94df-001892f7a557', 'AWS Cloud Practitioner Essentials', 'Lê Văn C', 'B.201', 64, 55, 150000, '2026-05-21 08:00:00', '2026-05-21 12:00:00', 'Giới thiệu AWS services: EC2, S3, RDS, Lambda, API Gateway. Thực hành deploy một web application lên AWS.', NOW(), NOW()),
('fd722829-7dad-41f1-b0cb-2d2748dcbf02', 'Redis Caching Strategies', 'Phạm Thị D', 'C.301', 50, 28, 0, '2026-05-21 13:00:00', '2026-05-21 16:00:00', 'Cache patterns với Redis: cache-aside, write-through, cache warming. Rate limiting, session storage và pub/sub messaging.', NOW(), NOW()),
('3367dacd-815f-4c0c-8bd0-16cff74945da', 'CI/CD với GitHub Actions', 'Hoàng Văn E', 'A.103', 60, 44, 90000, '2026-05-22 08:00:00', '2026-05-22 11:00:00', 'Thiết lập CI/CD pipeline với GitHub Actions. Automated testing, building, deploying. Docker image registry và blue-green deployment.', NOW(), NOW()),
('184d1c57-8d95-4f16-b45d-3947cacfc17f', 'Web Security Best Practices', 'Vũ Thị F', 'B.202', 62, 37, 0, '2026-05-22 13:00:00', '2026-05-22 16:00:00', 'Bảo mật web application: SQL Injection, XSS, CSRF, CORS. Áp dụng OWASP Top 10 và security headers.', NOW(), NOW()),
('79d1c435-209e-4d80-8414-1490b08008e0', 'MongoDB Aggregation Framework', 'Đặng Văn G', 'A.104', 60, 50, 70000, '2026-05-23 08:00:00', '2026-05-23 11:00:00', 'Xử lý dữ liệu phức tạp với MongoDB aggregation pipeline. $match, $group, $lookup, $unwind và performance optimization.', NOW(), NOW()),
('f61aa7b6-f5a5-485e-89bc-775cc53b7af0', 'Tailwind CSS Advanced Techniques', 'Bùi Thị H', 'C.302', 48, 30, 0, '2026-05-23 13:00:00', '2026-05-23 16:00:00', 'Tùy biến Tailwind config, custom plugins, animation với Tailwind, responsive design và dark mode implementation.', NOW(), NOW()),

-- Week 3: 25-29 May 2026 (8 workshops)
('26c22f48-ef2b-4817-b543-f2ff04a3e25e', 'React Native Mobile Development', 'Đỗ Văn I', 'A.101', 60, 42, 110000, '2026-05-25 08:00:00', '2026-05-25 12:00:00', 'Xây dựng mobile app với React Native và Expo. Navigation, state management, API integration và deployment lên App Store/Play Store.', NOW(), NOW()),
('979968ac-f397-4e3a-bf5e-2e84c92ddc15', 'Testing với Jest & React Testing Library', 'Dương Thị J', 'A.102', 60, 35, 0, '2026-05-25 13:00:00', '2026-05-25 16:00:00', 'Unit testing, integration testing và E2E testing. Mock API calls, test async code và coverage reporting.', NOW(), NOW()),
('d6f7e042-317b-4ea5-8e38-8aa3db45fabf', 'System Design cho Technical Interviews', 'Ngô Văn K', 'B.201', 63, 58, 200000, '2026-05-26 08:00:00', '2026-05-26 12:00:00', 'Chuẩn bị system design interview với các case studies: URL shortener, Chat system, News feed. Scalability và trade-offs.', NOW(), NOW()),
('a692ebbd-db8f-444e-bbd0-44412dd3f12a', 'Figma for Developers', 'Lý Thị L', 'C.301', 50, 27, 0, '2026-05-26 13:00:00', '2026-05-26 16:00:00', 'Developers học cách đọc Figma design, extract assets, hiểu design tokens và collaborate với designers hiệu quả.', NOW(), NOW()),
('7004cc43-d7bd-4332-9f08-56a00b31258f', 'Prisma ORM Master Class', 'Mai Văn M', 'A.103', 60, 46, 85000, '2026-05-27 08:00:00', '2026-05-27 11:00:00', 'Database modeling với Prisma schema, migrations, relations, transactions và raw queries. Integration với Next.js.', NOW(), NOW()),
('08562500-3622-4a01-84a7-5c5db53c49bd', 'WebSocket & Real-time Features', 'Cao Thị N', 'B.202', 63, 40, 0, '2026-05-27 13:00:00', '2026-05-27 16:00:00', 'Xây dựng real-time features với WebSocket và Socket.io. Chat application, live notifications và collaborative editing.', NOW(), NOW()),
('1ef264e7-e767-48c5-a49d-44f3852991cd', 'Python FastAPI cho Backend', 'Trịnh Văn O', 'A.104', 59, 52, 95000, '2026-05-28 08:00:00', '2026-05-28 11:00:00', 'FastAPI framework với automatic API documentation, async/await, Pydantic validation và SQLAlchemy integration.', NOW(), NOW()),
('b554c7a7-1b45-4ac6-bbc0-df60372b698b', 'Responsive Web Design Workshop', 'Nguyễn Thị P', 'C.302', 48, 32, 0, '2026-05-28 13:00:00', '2026-05-28 16:00:00', 'Mobile-first design, CSS Grid, Flexbox, media queries và responsive images. Hands-on với real-world layouts.', NOW(), NOW()),

-- Week 4: 30-31 May 2026 (8 workshops)
('7b7d28eb-e370-40dd-9aff-b293fa778f30', 'Machine Learning cơ bản với Python', 'Phạm Văn Q', 'A.101', 60, 55, 180000, '2026-05-30 08:00:00', '2026-05-30 12:00:00', 'Giới thiệu ML với scikit-learn, pandas, numpy. Linear regression, classification, clustering và model evaluation.', NOW(), NOW()),
('9931b97e-4530-4eba-924d-cdc022fec4d7', 'State Management: Zustand vs Redux', 'Hoàng Thị R', 'A.102', 60, 38, 0, '2026-05-30 13:00:00', '2026-05-30 16:00:00', 'So sánh state management solutions. Khi nào dùng Zustand, Redux Toolkit, hoặc React Context. Migration strategies.', NOW(), NOW()),
('848489b2-2ff8-4d6f-8ab2-369fa41a200b', 'DevOps Fundamentals', 'Vũ Văn S', 'B.201', 64, 60, 130000, '2026-05-31 08:00:00', '2026-05-31 12:00:00', 'DevOps culture, tools và practices. Infrastructure as Code với Terraform, monitoring với Prometheus/Grafana.', NOW(), NOW()),
('e629e46e-ff04-409f-bac2-deb2881fb63b', 'API Documentation với OpenAPI', 'Đặng Thị T', 'C.301', 49, 26, 0, '2026-05-31 13:00:00', '2026-05-31 16:00:00', 'Viết API documentation chuẩn với OpenAPI/Swagger. Auto-generate từ code và best practices cho developer experience.', NOW(), NOW()),

-- Future Workshops (Chưa đến ngày - 16 workshops)
('aa5b6ed3-ce1e-446e-9eba-d9d35731ea0b', 'Blockchain Development Basics', 'Bùi Văn U', 'A.103', 60, 0, 250000, '2026-06-05 08:00:00', '2026-06-05 12:00:00', 'Giới thiệu blockchain, smart contracts với Solidity. Deploy lên Ethereum testnet và build một DApp đơn giản.', NOW(), NOW()),
('7d2c18ee-6178-4398-a3c1-b82987b5b79e', 'Performance Optimization Workshop', 'Đỗ Thị V', 'B.202', 63, 0, 0, '2026-06-05 13:00:00', '2026-06-05 16:00:00', 'Web vitals, lighthouse scores, code splitting, lazy loading, image optimization. Profiling và debugging performance issues.', NOW(), NOW()),
('e5c9be4b-2ab3-4308-875d-077e9f8442ba', 'Serverless Architecture với AWS Lambda', 'Dương Văn W', 'A.104', 60, 0, 140000, '2026-06-06 08:00:00', '2026-06-06 11:00:00', 'Xây dựng serverless APIs với AWS Lambda, API Gateway, DynamoDB. Event-driven architecture và cost optimization.', NOW(), NOW()),
('a3e9aff1-db5c-4bc1-a503-e094bea50ff6', 'Design Patterns trong JavaScript', 'Ngô Thị X', 'C.302', 48, 0, 0, '2026-06-06 13:00:00', '2026-06-06 16:00:00', 'Singleton, Factory, Observer, Module patterns. Áp dụng design patterns vào React và Node.js applications.', NOW(), NOW()),
('87f06e2a-fe39-46de-ba91-64b2eeb53842', 'Advanced SQL Queries', 'Lý Văn Y', 'A.101', 59, 0, 75000, '2026-06-07 08:00:00', '2026-06-07 11:00:00', 'Window functions, CTEs, subqueries, query optimization. Solve complex business problems với SQL.', NOW(), NOW()),
('c417706a-fca9-4932-a16c-61283d325ed5', 'Web Accessibility (a11y) Guide', 'Mai Thị Z', 'A.102', 60, 0, 0, '2026-06-07 13:00:00', '2026-06-07 16:00:00', 'WCAG guidelines, semantic HTML, ARIA attributes, screen reader testing. Build accessible React components.', NOW(), NOW()),
('b5c22773-f6dc-4082-9604-acc00d16ed63', 'Event-Driven Architecture', 'Cao Văn AA', 'B.201', 64, 0, 160000, '2026-06-08 08:00:00', '2026-06-08 12:00:00', 'Event sourcing, CQRS, message queues với RabbitMQ/Kafka. Designing resilient distributed systems.', NOW(), NOW()),
('297c8de0-3c4c-4b9b-a154-2dfd03fd6f5b', 'CSS Architecture & Methodology', 'Trịnh Thị BB', 'C.301', 50, 0, 0, '2026-06-08 13:00:00', '2026-06-08 16:00:00', 'BEM, SMACSS, ITCSS methodologies. CSS-in-JS vs CSS Modules. Scalable CSS architecture cho large apps.', NOW(), NOW()),
('487e6a9f-9d15-4dd8-921a-f3ccca5d1ae1', 'Nest.js Microservices', 'Nguyễn Văn CC', 'A.103', 60, 0, 120000, '2026-06-09 08:00:00', '2026-06-09 11:00:00', 'Build microservices với NestJS. TCP, gRPC, message patterns. Service discovery và inter-service communication.', NOW(), NOW()),
('9cd835fa-4804-484c-aa6b-90e4508caab0', 'Product Management for Engineers', 'Trần Thị DD', 'B.202', 63, 0, 0, '2026-06-09 13:00:00', '2026-06-09 16:00:00', 'Engineers học cách suy nghĩ như PMs. User stories, roadmapping, prioritization và stakeholder management.', NOW(), NOW()),
('d0287dec-d322-4d03-bc47-965e0aae87f9', 'Authentication & Authorization Deep Dive', 'Lê Văn EE', 'A.104', 60, 0, 100000, '2026-06-10 08:00:00', '2026-06-10 11:00:00', 'JWT, OAuth 2.0, OpenID Connect, RBAC, ABAC. Secure session management và social login integration.', NOW(), NOW()),
('8d3342f0-6a74-4d68-ae5d-2fd8050e624c', 'Career Development cho Developers', 'Phạm Thị FF', 'C.302', 48, 0, 0, '2026-06-10 13:00:00', '2026-06-10 16:00:00', 'Resume writing, interview prep, salary negotiation, building personal brand. Chuyển đổi career path và continuous learning.', NOW(), NOW());

-- ============================================================
-- 3. REGISTRATIONS (Total: 50+ registrations with varying statuses)
-- ============================================================

-- 3.1. Confirmed Registrations (Free workshops)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('00d3f824-a367-4eac-bac7-a29dc5a0b958', '17cfebe3-41e6-489e-9c8a-2c763056b7b9', '8318861a-db3d-49b3-a156-7113a50f6390', 'confirmed', 'WS-1714896000000-a1b2c3d4', '2026-05-01 10:30:00'),
('34044b96-ac47-4539-9afa-30ece94a11b1', '17cfebe3-41e6-489e-9c8a-2c763056b7b9', '8cd7425e-d2bb-4113-a2fb-b131cbdc1b09', 'confirmed', 'WS-1714896001000-e5f6g7h8', '2026-05-01 10:31:00'),
('2af2fe3c-5090-487f-a966-fc252127a644', '444de0c3-91d3-4eec-bed3-efc2ffcd92f1', '066c3732-20dd-4231-bff8-c8f62fc6c42c', 'confirmed', 'WS-1714896002000-i9j0k1l2', '2026-05-02 14:20:00'),
('f71e290f-4f98-47cb-9799-00c350d21e7a', '6e4b8cc0-246a-4c85-ad29-fe9e11db8e81', 'c7dfbecb-7e25-4240-a1ca-58438ab77719', 'confirmed', 'WS-1714896003000-m3n4o5p6', '2026-05-03 09:15:00'),
('0ccddf92-6a90-459e-85ad-08c0dfd57dca', '8e940259-f28e-4e72-8227-671730a3d51c', '9c64fcad-4f22-42d4-89cc-4306828757ce', 'confirmed', 'WS-1714896004000-q7r8s9t0', '2026-05-04 11:45:00');

-- 3.2. Confirmed Registrations (Paid workshops - with payment)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('1e93d0bd-7b59-4e74-a5da-2243a5626571', '0d167d0f-091f-4f22-addd-50376874aaa5', 'f43cd356-c10c-4ca3-a20d-07ddb0225afd', 'confirmed', 'WS-1714896005000-u1v2w3x4', '2026-05-02 08:30:00'),
('6f1d59a4-a698-45b1-9b5d-3566b35b17c4', '24d8bad8-0f67-4a47-b80a-418051e0d946', 'aab65aca-4bb3-46fd-a1a9-6b4dff60ca6c', 'confirmed', 'WS-1714896006000-y5z6a7b8', '2026-05-02 09:00:00'),
('26c399eb-b37f-470f-a8f9-a018fb6a01ba', '4a4d4be0-271b-4acf-ab8a-26ce8267e015', '4fba29ac-a5d3-414b-8a37-e123afbe2496', 'confirmed', 'WS-1714896007000-c9d0e1f2', '2026-05-03 10:15:00'),
('7b1a028b-49cb-4b9b-ad1e-e99938263cff', '19c40f55-bb31-4b8f-8404-12b4ff2ecc6c', '1d162d19-4eb7-4d94-9035-a99eb1549b8a', 'confirmed', 'WS-1714896008000-g3h4i5j6', '2026-05-04 07:45:00'),
('b3d4f9b6-07c8-495f-bd74-3f54156a9436', '59db978b-ed08-407a-9383-b719b9fa22e7', '9f5fcf6a-dbbf-4824-bfa8-6a924e99c1bf', 'confirmed', 'WS-1714896009000-k7l8m9n0', '2026-05-05 13:20:00');

-- 3.3. Checked-in Registrations (đã check-in tại workshop đã qua)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('d73d2056-a060-4488-93cb-af9d8f048e36', '17cfebe3-41e6-489e-9c8a-2c763056b7b9', '2cb1a036-29ad-4f63-b8f7-79493720b20b', 'checked_in', 'WS-1714896010000-o1p2q3r4', '2026-05-01 09:00:00'),
('c42e7018-e13b-49f7-ba1a-6072140f1b04', '17cfebe3-41e6-489e-9c8a-2c763056b7b9', 'c007bdef-1ca5-4bcc-8de9-b204e60d0256', 'checked_in', 'WS-1714896011000-s5t6u7v8', '2026-05-01 09:05:00'),
('4bf29ca0-8969-46e1-8d07-ff51dc4ea2c5', '0d167d0f-091f-4f22-addd-50376874aaa5', '3c0236c5-1b60-4374-9f0a-521c2b096fd9', 'checked_in', 'WS-1714896012000-w9x0y1z2', '2026-05-02 12:00:00');

-- 3.4. Pending Registrations (đã đăng ký nhưng chưa thanh toán)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('e1ccc6b2-0fb1-4407-a45f-08b2869783b4', '4eef9eae-17a2-41e4-94df-001892f7a557', '7bd9ff84-3913-41f4-8c53-f0356e4db446', 'pending', 'WS-1714896013000-a3b4c5d6', '2026-05-06 10:00:00'),
('d6a32f4e-baf9-4b1a-850c-b168cf26b566', '3367dacd-815f-4c0c-8bd0-16cff74945da', 'e59a2ef7-f3d7-4c3b-9019-abf3b2c8ba02', 'pending', 'WS-1714896014000-e7f8g9h0', '2026-05-06 11:30:00');

-- Thêm registration mới f0000016 cho kịch bản test Failed Payment
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('b1a6bf33-5f2e-4ca4-aa1e-13af0e937d47', '79d1c435-209e-4d80-8414-1490b08008e0', '8318861a-db3d-49b3-a156-7113a50f6390', 'cancelled', 'WS-FAILED-TEST-QR', NOW());

-- ============================================================
-- 4. PAYMENTS (Total: 9 payments matching paid registrations)
-- ============================================================

-- 4.1. Successful Payments
INSERT INTO payments (id, registration_id, idempotency_key, transaction_id, status, created_at, updated_at) VALUES
('7dcf7696-54ca-4879-98c2-07d6fbf5923f', '1e93d0bd-7b59-4e74-a5da-2243a5626571', 'idem-1714896005000-a1b2c3d4', 'txn_mock_1714896005000', 'success', '2026-05-02 08:30:00', '2026-05-02 08:30:15'),
('c186ace1-9810-472c-8118-8762235e7218', '6f1d59a4-a698-45b1-9b5d-3566b35b17c4', 'idem-1714896006000-e5f6g7h8', 'txn_mock_1714896006000', 'success', '2026-05-02 09:00:00', '2026-05-02 09:00:12'),
('06a39712-1bf7-4525-bfa1-7020bc6b8c77', '26c399eb-b37f-470f-a8f9-a018fb6a01ba', 'idem-1714896007000-i9j0k1l2', 'txn_mock_1714896007000', 'success', '2026-05-03 10:15:00', '2026-05-03 10:15:18'),
('6d007a6c-4a39-46aa-a87a-230156a2176f', '7b1a028b-49cb-4b9b-ad1e-e99938263cff', 'idem-1714896008000-m3n4o5p6', 'txn_mock_1714896008000', 'success', '2026-05-04 07:45:00', '2026-05-04 07:45:20'),
('4e3d0a6e-186c-4a97-988a-d21263d3cafd', 'b3d4f9b6-07c8-495f-bd74-3f54156a9436', 'idem-1714896009000-q7r8s9t0', 'txn_mock_1714896009000', 'success', '2026-05-05 13:20:00', '2026-05-05 13:20:10'),
('0a92fc8b-8c2d-4951-a438-4de1ebb3b821', '4bf29ca0-8969-46e1-8d07-ff51dc4ea2c5', 'idem-1714896012000-u1v2w3x4', 'txn_mock_1714896012000', 'success', '2026-05-02 12:00:00', '2026-05-02 12:00:14');

-- 4.2. Pending Payments (Circuit breaker open scenario)
INSERT INTO payments (id, registration_id, idempotency_key, transaction_id, status, created_at, updated_at) VALUES
('7d9414b0-fd92-4c51-a091-8c5e7a2eead9', 'e1ccc6b2-0fb1-4407-a45f-08b2869783b4', NULL, NULL, 'pending', '2026-05-06 10:00:00', '2026-05-06 10:00:00'),
('3a465803-1619-43a2-967b-5ff86334b5ef', 'd6a32f4e-baf9-4b1a-850c-b168cf26b566', NULL, NULL, 'pending', '2026-05-06 11:30:00', '2026-05-06 11:30:00');

-- 4.3. Failed Payment (card declined scenario)
INSERT INTO payments (id, registration_id, idempotency_key, transaction_id, status, created_at, updated_at) VALUES
('bbce2787-99c4-4a07-bfbe-57697492c17a', 'b1a6bf33-5f2e-4ca4-aa1e-13af0e937d47', 'idem-1714896015000-g3h4i5j6', NULL, 'failed', '2026-05-06 10:05:00', '2026-05-06 10:05:10');

-- ============================================================
-- 5. CHECK_INS (Total: 8 check-ins)
-- ============================================================

-- 5.1. Synced Check-ins (online mode)
INSERT INTO check_ins (id, registration_id, staff_id, sync_status, device_id, checked_in_at, created_at, updated_at) VALUES
('ba18e05b-c324-4930-ab9c-c7ca8562afc8', 'd73d2056-a060-4488-93cb-af9d8f048e36', '7e713240-9056-423d-a861-4028fe4bee7e', 'synced', 'device-staff1-iphone', '2026-05-15 07:55:00', '2026-05-15 07:55:00', '2026-05-15 07:55:00'),
('fac7f981-baf1-44bc-9aa7-3aa71ef06b4d', 'c42e7018-e13b-49f7-ba1a-6072140f1b04', '7e713240-9056-423d-a861-4028fe4bee7e', 'synced', 'device-staff1-iphone', '2026-05-15 07:58:00', '2026-05-15 07:58:00', '2026-05-15 07:58:00'),
('802ca8dd-2a89-4f68-a054-126805d1a050', '4bf29ca0-8969-46e1-8d07-ff51dc4ea2c5', '1c85abc7-fd01-4605-a558-e4f83eb08811', 'synced', 'device-staff2-android', '2026-05-15 12:50:00', '2026-05-15 12:50:00', '2026-05-15 12:50:00');

-- 5.2. Pending Sync Check-ins (offline mode - will be synced later)
INSERT INTO check_ins (id, registration_id, staff_id, sync_status, device_id, checked_in_at, created_at, updated_at) VALUES
('57368aca-f8bd-4cef-8d25-7f83e9b1458d', '00d3f824-a367-4eac-bac7-a29dc5a0b958', '45b40255-977f-4390-a4b4-c4611e362e25', 'pending_sync', 'device-staff3-android', '2026-05-15 07:45:00', '2026-05-15 07:45:00', '2026-05-15 07:45:00'),
('1b17c634-a23c-45db-b4d6-3dfff2262edc', '34044b96-ac47-4539-9afa-30ece94a11b1', '45b40255-977f-4390-a4b4-c4611e362e25', 'pending_sync', 'device-staff3-android', '2026-05-15 07:50:00', '2026-05-15 07:50:00', '2026-05-15 07:50:00');

COMMIT;

-- ============================================================
-- SUMMARY
-- ============================================================
-- Users: 153 total
--   - 3 Admins (with password)
--   - 5 Staff (with password)
--   - 15 Students (with password - đã đăng ký)
--   - 130 Students (NO password - sync từ CSV, chưa đăng ký)
--
-- Workshops: 40 total
--   - 28 workshops đã diễn ra/đang diễn ra (May 15-31)
--   - 12 workshops sắp tới (June 5-10)
--   - Mix giữa free (16) và paid (24)
--   - Capacity từ 48-64 seats
--   - Giá từ 0 đến 250,000 VND
--
-- Registrations: 15 total
--   - 5 confirmed (free workshops)
--   - 5 confirmed (paid workshops)
--   - 3 checked_in
--   - 2 pending (chưa thanh toán)
--
-- Payments: 9 total
--   - 6 success
--   - 2 pending
--   - 1 failed
--
-- Check-ins: 5 total
--   - 3 synced
--   - 2 pending_sync (offline)
-- ============================================================
