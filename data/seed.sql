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
('a1111111-1111-1111-1111-111111111111', NULL, 'admin@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Nguyễn Văn Admin', 'admin', NOW(), NOW()),
('a2222222-2222-2222-2222-222222222222', NULL, 'organizer1@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Trần Thị Hương', 'admin', NOW(), NOW()),
('a3333333-3333-3333-3333-333333333333', NULL, 'organizer2@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Lê Văn Minh', 'admin', NOW(), NOW());

-- 1.2. Staff Users (5 users với password)
INSERT INTO users (id, student_id, email, password_hash, full_name, user_role, created_at, updated_at) VALUES
('b1111111-1111-1111-1111-111111111111', NULL, 'staff1@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Phạm Thị Lan', 'staff', NOW(), NOW()),
('b2222222-2222-2222-2222-222222222222', NULL, 'staff2@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Hoàng Văn Nam', 'staff', NOW(), NOW()),
('b3333333-3333-3333-3333-333333333333', NULL, 'staff3@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Vũ Thị Mai', 'staff', NOW(), NOW()),
('b4444444-4444-4444-4444-444444444444', NULL, 'staff4@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Đặng Văn Tú', 'staff', NOW(), NOW()),
('b5555555-5555-5555-5555-555555555555', NULL, 'staff5@unihub.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Bùi Thị Hoa', 'staff', NOW(), NOW());

-- 1.3. Student Users - Đã đăng ký (15 students với password)
INSERT INTO users (id, student_id, email, password_hash, full_name, user_role, created_at, updated_at) VALUES
('00000001-0000-0000-0000-000000000001', 'SV001', 'nguyen.van.a@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Nguyễn Văn A', 'student', NOW(), NOW()),
('00000002-0000-0000-0000-000000000002', 'SV002', 'tran.thi.b@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Trần Thị B', 'student', NOW(), NOW()),
('00000003-0000-0000-0000-000000000003', 'SV003', 'le.van.c@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Lê Văn C', 'student', NOW(), NOW()),
('00000004-0000-0000-0000-000000000004', 'SV004', 'pham.thi.d@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Phạm Thị D', 'student', NOW(), NOW()),
('00000005-0000-0000-0000-000000000005', 'SV005', 'hoang.van.e@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Hoàng Văn E', 'student', NOW(), NOW()),
('00000006-0000-0000-0000-000000000006', 'SV006', 'vu.thi.f@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Vũ Thị F', 'student', NOW(), NOW()),
('00000007-0000-0000-0000-000000000007', 'SV007', 'dang.van.g@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Đặng Văn G', 'student', NOW(), NOW()),
('00000008-0000-0000-0000-000000000008', 'SV008', 'bui.thi.h@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Bùi Thị H', 'student', NOW(), NOW()),
('00000009-0000-0000-0000-000000000009', 'SV009', 'do.van.i@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Đỗ Văn I', 'student', NOW(), NOW()),
('00000010-0000-0000-0000-000000000010', 'SV010', 'duong.thi.j@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Dương Thị J', 'student', NOW(), NOW()),
('00000011-0000-0000-0000-000000000011', 'SV011', 'ngo.van.k@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Ngô Văn K', 'student', NOW(), NOW()),
('00000012-0000-0000-0000-000000000012', 'SV012', 'ly.thi.l@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Lý Thị L', 'student', NOW(), NOW()),
('00000013-0000-0000-0000-000000000013', 'SV013', 'mai.van.m@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Mai Văn M', 'student', NOW(), NOW()),
('00000014-0000-0000-0000-000000000014', 'SV014', 'cao.thi.n@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Cao Thị N', 'student', NOW(), NOW()),
('00000015-0000-0000-0000-000000000015', 'SV015', 'trinh.van.o@student.edu.vn', '$2b$10$lO08yECsZDmiWyc1nHuI7uUZl8oNkC70WYsOFtDTngRWO/cuEgC9S', 'Trịnh Văn O', 'student', NOW(), NOW());

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
('e0000001-0000-0000-0000-000000000001', 'NestJS Backend Development từ A-Z', 'Nguyễn Minh Tuấn', 'A.101', 60, 45, 0, '2026-05-15 08:00:00', '2026-05-15 11:00:00', 'Workshop giới thiệu NestJS framework, từ cơ bản đến nâng cao. Học viên sẽ được thực hành xây dựng RESTful API với TypeORM, JWT authentication và testing.', NOW(), NOW()),
('e0000002-0000-0000-0000-000000000002', 'React Best Practices 2026', 'Trần Thị Hương', 'A.102', 59, 38, 50000, '2026-05-15 13:00:00', '2026-05-15 16:00:00', 'Tìm hiểu các design patterns trong React như Compound Components, Render Props, Higher-Order Components. Thực hành với hooks và performance optimization.', NOW(), NOW()),
('e0000003-0000-0000-0000-000000000003', 'Docker & Kubernetes cho Developers', 'Lê Văn Minh', 'B.201', 64, 52, 100000, '2026-05-16 08:00:00', '2026-05-16 12:00:00', 'Workshop thực hành containerization với Docker và orchestration với Kubernetes. Học viên sẽ deploy một ứng dụng microservices hoàn chỉnh.', NOW(), NOW()),
('e0000004-0000-0000-0000-000000000004', 'UI/UX Design Thinking', 'Phạm Thị Lan', 'C.301', 50, 30, 0, '2026-05-16 13:00:00', '2026-05-16 16:00:00', 'Khóa học về quy trình thiết kế sản phẩm từ nghiên cứu người dùng, wireframing, prototyping đến user testing. Sử dụng Figma để thực hành.', NOW(), NOW()),
('e0000005-0000-0000-0000-000000000005', 'PostgreSQL Performance Tuning', 'Hoàng Văn Nam', 'A.103', 58, 42, 75000, '2026-05-17 08:00:00', '2026-05-17 11:00:00', 'Tối ưu hóa database với indexing strategies, query optimization, connection pooling và partitioning. Hands-on với database thực tế.', NOW(), NOW()),
('e0000006-0000-0000-0000-000000000006', 'GraphQL vs REST API', 'Vũ Thị Mai', 'B.202', 63, 35, 0, '2026-05-17 13:00:00', '2026-05-17 16:00:00', 'So sánh GraphQL và REST API, khi nào nên dùng cái gì. Xây dựng GraphQL server với Apollo và client với React Query.', NOW(), NOW()),
('e0000007-0000-0000-0000-000000000007', 'Microservices Architecture Patterns', 'Đặng Văn Tú', 'A.104', 60, 48, 120000, '2026-05-18 08:00:00', '2026-05-18 12:00:00', 'Thiết kế hệ thống microservices với API Gateway, Service Discovery, Circuit Breaker patterns. Case study từ các hệ thống thực tế.', NOW(), NOW()),
('e0000008-0000-0000-0000-000000000008', 'Git Advanced Workflows', 'Bùi Thị Hoa', 'C.302', 48, 25, 0, '2026-05-18 13:00:00', '2026-05-18 16:00:00', 'Nắm vững Git branching strategies (Git Flow, GitHub Flow), rebase vs merge, cherry-pick, và cách resolve conflicts phức tạp.', NOW(), NOW()),

-- Week 2: 20-24 May 2026 (8 workshops)
('e0000009-0000-0000-0000-000000000009', 'Next.js 14 App Router Deep Dive', 'Nguyễn Văn A', 'A.101', 59, 40, 80000, '2026-05-20 08:00:00', '2026-05-20 11:00:00', 'Khám phá Next.js 14 với App Router, Server Components, Server Actions, streaming và Suspense. Build một ứng dụng e-commerce.', NOW(), NOW()),
('e0000010-0000-0000-0000-000000000010', 'TypeScript Tips & Tricks', 'Trần Thị B', 'A.102', 60, 33, 0, '2026-05-20 13:00:00', '2026-05-20 16:00:00', 'Advanced TypeScript features: Generics, Utility Types, Conditional Types, Template Literal Types. Áp dụng vào dự án thực tế.', NOW(), NOW()),
('e0000011-0000-0000-0000-000000000011', 'AWS Cloud Practitioner Essentials', 'Lê Văn C', 'B.201', 64, 55, 150000, '2026-05-21 08:00:00', '2026-05-21 12:00:00', 'Giới thiệu AWS services: EC2, S3, RDS, Lambda, API Gateway. Thực hành deploy một web application lên AWS.', NOW(), NOW()),
('e0000012-0000-0000-0000-000000000012', 'Redis Caching Strategies', 'Phạm Thị D', 'C.301', 50, 28, 0, '2026-05-21 13:00:00', '2026-05-21 16:00:00', 'Cache patterns với Redis: cache-aside, write-through, cache warming. Rate limiting, session storage và pub/sub messaging.', NOW(), NOW()),
('e0000013-0000-0000-0000-000000000013', 'CI/CD với GitHub Actions', 'Hoàng Văn E', 'A.103', 60, 44, 90000, '2026-05-22 08:00:00', '2026-05-22 11:00:00', 'Thiết lập CI/CD pipeline với GitHub Actions. Automated testing, building, deploying. Docker image registry và blue-green deployment.', NOW(), NOW()),
('e0000014-0000-0000-0000-000000000014', 'Web Security Best Practices', 'Vũ Thị F', 'B.202', 62, 37, 0, '2026-05-22 13:00:00', '2026-05-22 16:00:00', 'Bảo mật web application: SQL Injection, XSS, CSRF, CORS. Áp dụng OWASP Top 10 và security headers.', NOW(), NOW()),
('e0000015-0000-0000-0000-000000000015', 'MongoDB Aggregation Framework', 'Đặng Văn G', 'A.104', 60, 50, 70000, '2026-05-23 08:00:00', '2026-05-23 11:00:00', 'Xử lý dữ liệu phức tạp với MongoDB aggregation pipeline. $match, $group, $lookup, $unwind và performance optimization.', NOW(), NOW()),
('e0000016-0000-0000-0000-000000000016', 'Tailwind CSS Advanced Techniques', 'Bùi Thị H', 'C.302', 48, 30, 0, '2026-05-23 13:00:00', '2026-05-23 16:00:00', 'Tùy biến Tailwind config, custom plugins, animation với Tailwind, responsive design và dark mode implementation.', NOW(), NOW()),

-- Week 3: 25-29 May 2026 (8 workshops)
('e0000017-0000-0000-0000-000000000017', 'React Native Mobile Development', 'Đỗ Văn I', 'A.101', 60, 42, 110000, '2026-05-25 08:00:00', '2026-05-25 12:00:00', 'Xây dựng mobile app với React Native và Expo. Navigation, state management, API integration và deployment lên App Store/Play Store.', NOW(), NOW()),
('e0000018-0000-0000-0000-000000000018', 'Testing với Jest & React Testing Library', 'Dương Thị J', 'A.102', 60, 35, 0, '2026-05-25 13:00:00', '2026-05-25 16:00:00', 'Unit testing, integration testing và E2E testing. Mock API calls, test async code và coverage reporting.', NOW(), NOW()),
('e0000019-0000-0000-0000-000000000019', 'System Design cho Technical Interviews', 'Ngô Văn K', 'B.201', 63, 58, 200000, '2026-05-26 08:00:00', '2026-05-26 12:00:00', 'Chuẩn bị system design interview với các case studies: URL shortener, Chat system, News feed. Scalability và trade-offs.', NOW(), NOW()),
('e0000020-0000-0000-0000-000000000020', 'Figma for Developers', 'Lý Thị L', 'C.301', 50, 27, 0, '2026-05-26 13:00:00', '2026-05-26 16:00:00', 'Developers học cách đọc Figma design, extract assets, hiểu design tokens và collaborate với designers hiệu quả.', NOW(), NOW()),
('e0000021-0000-0000-0000-000000000021', 'Prisma ORM Master Class', 'Mai Văn M', 'A.103', 60, 46, 85000, '2026-05-27 08:00:00', '2026-05-27 11:00:00', 'Database modeling với Prisma schema, migrations, relations, transactions và raw queries. Integration với Next.js.', NOW(), NOW()),
('e0000022-0000-0000-0000-000000000022', 'WebSocket & Real-time Features', 'Cao Thị N', 'B.202', 63, 40, 0, '2026-05-27 13:00:00', '2026-05-27 16:00:00', 'Xây dựng real-time features với WebSocket và Socket.io. Chat application, live notifications và collaborative editing.', NOW(), NOW()),
('e0000023-0000-0000-0000-000000000023', 'Python FastAPI cho Backend', 'Trịnh Văn O', 'A.104', 59, 52, 95000, '2026-05-28 08:00:00', '2026-05-28 11:00:00', 'FastAPI framework với automatic API documentation, async/await, Pydantic validation và SQLAlchemy integration.', NOW(), NOW()),
('e0000024-0000-0000-0000-000000000024', 'Responsive Web Design Workshop', 'Nguyễn Thị P', 'C.302', 48, 32, 0, '2026-05-28 13:00:00', '2026-05-28 16:00:00', 'Mobile-first design, CSS Grid, Flexbox, media queries và responsive images. Hands-on với real-world layouts.', NOW(), NOW()),

-- Week 4: 30-31 May 2026 (8 workshops)
('e0000025-0000-0000-0000-000000000025', 'Machine Learning cơ bản với Python', 'Phạm Văn Q', 'A.101', 60, 55, 180000, '2026-05-30 08:00:00', '2026-05-30 12:00:00', 'Giới thiệu ML với scikit-learn, pandas, numpy. Linear regression, classification, clustering và model evaluation.', NOW(), NOW()),
('e0000026-0000-0000-0000-000000000026', 'State Management: Zustand vs Redux', 'Hoàng Thị R', 'A.102', 60, 38, 0, '2026-05-30 13:00:00', '2026-05-30 16:00:00', 'So sánh state management solutions. Khi nào dùng Zustand, Redux Toolkit, hoặc React Context. Migration strategies.', NOW(), NOW()),
('e0000027-0000-0000-0000-000000000027', 'DevOps Fundamentals', 'Vũ Văn S', 'B.201', 64, 60, 130000, '2026-05-31 08:00:00', '2026-05-31 12:00:00', 'DevOps culture, tools và practices. Infrastructure as Code với Terraform, monitoring với Prometheus/Grafana.', NOW(), NOW()),
('e0000028-0000-0000-0000-000000000028', 'API Documentation với OpenAPI', 'Đặng Thị T', 'C.301', 49, 26, 0, '2026-05-31 13:00:00', '2026-05-31 16:00:00', 'Viết API documentation chuẩn với OpenAPI/Swagger. Auto-generate từ code và best practices cho developer experience.', NOW(), NOW()),

-- Future Workshops (Chưa đến ngày - 16 workshops)
('e0000029-0000-0000-0000-000000000029', 'Blockchain Development Basics', 'Bùi Văn U', 'A.103', 60, 0, 250000, '2026-06-05 08:00:00', '2026-06-05 12:00:00', 'Giới thiệu blockchain, smart contracts với Solidity. Deploy lên Ethereum testnet và build một DApp đơn giản.', NOW(), NOW()),
('e0000030-0000-0000-0000-000000000030', 'Performance Optimization Workshop', 'Đỗ Thị V', 'B.202', 63, 0, 0, '2026-06-05 13:00:00', '2026-06-05 16:00:00', 'Web vitals, lighthouse scores, code splitting, lazy loading, image optimization. Profiling và debugging performance issues.', NOW(), NOW()),
('e0000031-0000-0000-0000-000000000031', 'Serverless Architecture với AWS Lambda', 'Dương Văn W', 'A.104', 60, 0, 140000, '2026-06-06 08:00:00', '2026-06-06 11:00:00', 'Xây dựng serverless APIs với AWS Lambda, API Gateway, DynamoDB. Event-driven architecture và cost optimization.', NOW(), NOW()),
('e0000032-0000-0000-0000-000000000032', 'Design Patterns trong JavaScript', 'Ngô Thị X', 'C.302', 48, 0, 0, '2026-06-06 13:00:00', '2026-06-06 16:00:00', 'Singleton, Factory, Observer, Module patterns. Áp dụng design patterns vào React và Node.js applications.', NOW(), NOW()),
('e0000033-0000-0000-0000-000000000033', 'Advanced SQL Queries', 'Lý Văn Y', 'A.101', 59, 0, 75000, '2026-06-07 08:00:00', '2026-06-07 11:00:00', 'Window functions, CTEs, subqueries, query optimization. Solve complex business problems với SQL.', NOW(), NOW()),
('e0000034-0000-0000-0000-000000000034', 'Web Accessibility (a11y) Guide', 'Mai Thị Z', 'A.102', 60, 0, 0, '2026-06-07 13:00:00', '2026-06-07 16:00:00', 'WCAG guidelines, semantic HTML, ARIA attributes, screen reader testing. Build accessible React components.', NOW(), NOW()),
('e0000035-0000-0000-0000-000000000035', 'Event-Driven Architecture', 'Cao Văn AA', 'B.201', 64, 0, 160000, '2026-06-08 08:00:00', '2026-06-08 12:00:00', 'Event sourcing, CQRS, message queues với RabbitMQ/Kafka. Designing resilient distributed systems.', NOW(), NOW()),
('e0000036-0000-0000-0000-000000000036', 'CSS Architecture & Methodology', 'Trịnh Thị BB', 'C.301', 50, 0, 0, '2026-06-08 13:00:00', '2026-06-08 16:00:00', 'BEM, SMACSS, ITCSS methodologies. CSS-in-JS vs CSS Modules. Scalable CSS architecture cho large apps.', NOW(), NOW()),
('e0000037-0000-0000-0000-000000000037', 'Nest.js Microservices', 'Nguyễn Văn CC', 'A.103', 60, 0, 120000, '2026-06-09 08:00:00', '2026-06-09 11:00:00', 'Build microservices với NestJS. TCP, gRPC, message patterns. Service discovery và inter-service communication.', NOW(), NOW()),
('e0000038-0000-0000-0000-000000000038', 'Product Management for Engineers', 'Trần Thị DD', 'B.202', 63, 0, 0, '2026-06-09 13:00:00', '2026-06-09 16:00:00', 'Engineers học cách suy nghĩ như PMs. User stories, roadmapping, prioritization và stakeholder management.', NOW(), NOW()),
('e0000039-0000-0000-0000-000000000039', 'Authentication & Authorization Deep Dive', 'Lê Văn EE', 'A.104', 60, 0, 100000, '2026-06-10 08:00:00', '2026-06-10 11:00:00', 'JWT, OAuth 2.0, OpenID Connect, RBAC, ABAC. Secure session management và social login integration.', NOW(), NOW()),
('e0000040-0000-0000-0000-000000000040', 'Career Development cho Developers', 'Phạm Thị FF', 'C.302', 48, 0, 0, '2026-06-10 13:00:00', '2026-06-10 16:00:00', 'Resume writing, interview prep, salary negotiation, building personal brand. Chuyển đổi career path và continuous learning.', NOW(), NOW());

-- ============================================================
-- 3. REGISTRATIONS (Total: 50+ registrations with varying statuses)
-- ============================================================

-- 3.1. Confirmed Registrations (Free workshops)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('f0000001-0000-0000-0000-000000000001', 'e0000001-0000-0000-0000-000000000001', '00000001-0000-0000-0000-000000000001', 'confirmed', 'WS-1714896000000-a1b2c3d4', '2026-05-01 10:30:00'),
('f0000002-0000-0000-0000-000000000002', 'e0000001-0000-0000-0000-000000000001', '00000002-0000-0000-0000-000000000002', 'confirmed', 'WS-1714896001000-e5f6g7h8', '2026-05-01 10:31:00'),
('f0000003-0000-0000-0000-000000000003', 'e0000004-0000-0000-0000-000000000004', '00000003-0000-0000-0000-000000000003', 'confirmed', 'WS-1714896002000-i9j0k1l2', '2026-05-02 14:20:00'),
('f0000004-0000-0000-0000-000000000004', 'e0000006-0000-0000-0000-000000000006', '00000004-0000-0000-0000-000000000004', 'confirmed', 'WS-1714896003000-m3n4o5p6', '2026-05-03 09:15:00'),
('f0000005-0000-0000-0000-000000000005', 'e0000008-0000-0000-0000-000000000008', '00000005-0000-0000-0000-000000000005', 'confirmed', 'WS-1714896004000-q7r8s9t0', '2026-05-04 11:45:00');

-- 3.2. Confirmed Registrations (Paid workshops - with payment)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('f0000006-0000-0000-0000-000000000006', 'e0000002-0000-0000-0000-000000000002', '00000006-0000-0000-0000-000000000006', 'confirmed', 'WS-1714896005000-u1v2w3x4', '2026-05-02 08:30:00'),
('f0000007-0000-0000-0000-000000000007', 'e0000003-0000-0000-0000-000000000003', '00000007-0000-0000-0000-000000000007', 'confirmed', 'WS-1714896006000-y5z6a7b8', '2026-05-02 09:00:00'),
('f0000008-0000-0000-0000-000000000008', 'e0000005-0000-0000-0000-000000000005', '00000008-0000-0000-0000-000000000008', 'confirmed', 'WS-1714896007000-c9d0e1f2', '2026-05-03 10:15:00'),
('f0000009-0000-0000-0000-000000000009', 'e0000007-0000-0000-0000-000000000007', '00000009-0000-0000-0000-000000000009', 'confirmed', 'WS-1714896008000-g3h4i5j6', '2026-05-04 07:45:00'),
('f0000010-0000-0000-0000-000000000010', 'e0000009-0000-0000-0000-000000000009', '00000010-0000-0000-0000-000000000010', 'confirmed', 'WS-1714896009000-k7l8m9n0', '2026-05-05 13:20:00');

-- 3.3. Checked-in Registrations (đã check-in tại workshop đã qua)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('f0000011-0000-0000-0000-000000000011', 'e0000001-0000-0000-0000-000000000001', '00000011-0000-0000-0000-000000000011', 'checked_in', 'WS-1714896010000-o1p2q3r4', '2026-05-01 09:00:00'),
('f0000012-0000-0000-0000-000000000012', 'e0000001-0000-0000-0000-000000000001', '00000012-0000-0000-0000-000000000012', 'checked_in', 'WS-1714896011000-s5t6u7v8', '2026-05-01 09:05:00'),
('f0000013-0000-0000-0000-000000000013', 'e0000002-0000-0000-0000-000000000002', '00000013-0000-0000-0000-000000000013', 'checked_in', 'WS-1714896012000-w9x0y1z2', '2026-05-02 12:00:00');

-- 3.4. Pending Registrations (đã đăng ký nhưng chưa thanh toán)
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('f0000014-0000-0000-0000-000000000014', 'e0000011-0000-0000-0000-000000000011', '00000014-0000-0000-0000-000000000014', 'pending', 'WS-1714896013000-a3b4c5d6', '2026-05-06 10:00:00'),
('f0000015-0000-0000-0000-000000000015', 'e0000013-0000-0000-0000-000000000013', '00000015-0000-0000-0000-000000000015', 'pending', 'WS-1714896014000-e7f8g9h0', '2026-05-06 11:30:00');

-- Thêm registration mới f0000016 cho kịch bản test Failed Payment
INSERT INTO registrations (id, workshop_id, user_id, status, qr_code, registered_at) VALUES
('f0000016-0000-0000-0000-000000000016', 'e0000015-0000-0000-0000-000000000015', '00000001-0000-0000-0000-000000000001', 'pending', 'WS-FAILED-TEST-QR', NOW());

-- ============================================================
-- 4. PAYMENTS (Total: 9 payments matching paid registrations)
-- ============================================================

-- 4.1. Successful Payments
INSERT INTO payments (id, registration_id, idempotency_key, transaction_id, status, created_at, updated_at) VALUES
('d0000001-0000-0000-0000-000000000001', 'f0000006-0000-0000-0000-000000000006', 'idem-1714896005000-a1b2c3d4', 'txn_mock_1714896005000', 'success', '2026-05-02 08:30:00', '2026-05-02 08:30:15'),
('d0000002-0000-0000-0000-000000000002', 'f0000007-0000-0000-0000-000000000007', 'idem-1714896006000-e5f6g7h8', 'txn_mock_1714896006000', 'success', '2026-05-02 09:00:00', '2026-05-02 09:00:12'),
('d0000003-0000-0000-0000-000000000003', 'f0000008-0000-0000-0000-000000000008', 'idem-1714896007000-i9j0k1l2', 'txn_mock_1714896007000', 'success', '2026-05-03 10:15:00', '2026-05-03 10:15:18'),
('d0000004-0000-0000-0000-000000000004', 'f0000009-0000-0000-0000-000000000009', 'idem-1714896008000-m3n4o5p6', 'txn_mock_1714896008000', 'success', '2026-05-04 07:45:00', '2026-05-04 07:45:20'),
('d0000005-0000-0000-0000-000000000005', 'f0000010-0000-0000-0000-000000000010', 'idem-1714896009000-q7r8s9t0', 'txn_mock_1714896009000', 'success', '2026-05-05 13:20:00', '2026-05-05 13:20:10'),
('d0000006-0000-0000-0000-000000000006', 'f0000013-0000-0000-0000-000000000013', 'idem-1714896012000-u1v2w3x4', 'txn_mock_1714896012000', 'success', '2026-05-02 12:00:00', '2026-05-02 12:00:14');

-- 4.2. Pending Payments (Circuit breaker open scenario)
INSERT INTO payments (id, registration_id, idempotency_key, transaction_id, status, created_at, updated_at) VALUES
('d0000007-0000-0000-0000-000000000007', 'f0000014-0000-0000-0000-000000000014', 'idem-1714896013000-y5z6a7b8', NULL, 'pending', '2026-05-06 10:00:00', '2026-05-06 10:00:00'),
('d0000008-0000-0000-0000-000000000008', 'f0000015-0000-0000-0000-000000000015', 'idem-1714896014000-c9d0e1f2', NULL, 'pending', '2026-05-06 11:30:00', '2026-05-06 11:30:00');

-- 4.3. Failed Payment (card declined scenario)
INSERT INTO payments (id, registration_id, idempotency_key, transaction_id, status, created_at, updated_at) VALUES
('d0000009-0000-0000-0000-000000000009', 'f0000016-0000-0000-0000-000000000016', 'idem-1714896015000-g3h4i5j6', NULL, 'failed', '2026-05-06 10:05:00', '2026-05-06 10:05:10');

-- ============================================================
-- 5. CHECK_INS (Total: 8 check-ins)
-- ============================================================

-- 5.1. Synced Check-ins (online mode)
INSERT INTO check_ins (id, registration_id, staff_id, sync_status, device_id, checked_in_at, created_at, updated_at) VALUES
('c0000001-0000-0000-0000-000000000001', 'f0000011-0000-0000-0000-000000000011', 'b1111111-1111-1111-1111-111111111111', 'synced', 'device-staff1-iphone', '2026-05-15 07:55:00', '2026-05-15 07:55:00', '2026-05-15 07:55:00'),
('c0000002-0000-0000-0000-000000000002', 'f0000012-0000-0000-0000-000000000012', 'b1111111-1111-1111-1111-111111111111', 'synced', 'device-staff1-iphone', '2026-05-15 07:58:00', '2026-05-15 07:58:00', '2026-05-15 07:58:00'),
('c0000003-0000-0000-0000-000000000003', 'f0000013-0000-0000-0000-000000000013', 'b2222222-2222-2222-2222-222222222222', 'synced', 'device-staff2-android', '2026-05-15 12:50:00', '2026-05-15 12:50:00', '2026-05-15 12:50:00');

-- 5.2. Pending Sync Check-ins (offline mode - will be synced later)
INSERT INTO check_ins (id, registration_id, staff_id, sync_status, device_id, checked_in_at, created_at, updated_at) VALUES
('c0000004-0000-0000-0000-000000000004', 'f0000001-0000-0000-0000-000000000001', 'b3333333-3333-3333-3333-333333333333', 'pending_sync', 'device-staff3-android', '2026-05-15 07:45:00', '2026-05-15 07:45:00', '2026-05-15 07:45:00'),
('c0000005-0000-0000-0000-000000000005', 'f0000002-0000-0000-0000-000000000002', 'b3333333-3333-3333-3333-333333333333', 'pending_sync', 'device-staff3-android', '2026-05-15 07:50:00', '2026-05-15 07:50:00', '2026-05-15 07:50:00');

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
