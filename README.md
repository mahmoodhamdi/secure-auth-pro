# SecureAuth Pro 🔐

نظام مصادقة متقدم يدعم JWT و OAuth مع Next.js و Node.js

## 📋 نظرة عامة

SecureAuth Pro هو نظام مصادقة شامل وآمن يوفر:

- مصادقة JWT متقدمة
- تكامل OAuth (Google, GitHub, Facebook)
- Two-Factor Authentication (2FA)
- إدارة الجلسات المتعددة
- نظام Refresh Tokens آمن

## 🏗️ البنية التقنية

### Backend

- **Runtime**: Node.js 20+
- **Framework**: Express.js + TypeScript
- **Database**: MongoDB 7+
- **Cache**: Redis 7+
- **Authentication**: JWT + Passport.js
- **Validation**: Zod
- **Security**: Helmet, Rate Limiting

### Frontend

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

### DevOps

- **Containerization**: Docker + Docker Compose
- **Environment**: Docker Multi-Stage Builds
- **Development**: Hot Reload enabled

## 📁 هيكل المشروع

```structure
secureauth-pro/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   ├── jwt.ts
│   │   │   ├── oauth.ts
│   │   │   └── redis.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   └── oauth.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── validation.middleware.ts
│   │   │   ├── rateLimiter.middleware.ts
│   │   │   └── errorHandler.middleware.ts
│   │   ├── models/
│   │   │   ├── User.model.ts
│   │   │   ├── RefreshToken.model.ts
│   │   │   └── Session.model.ts
│   │   ├── routes/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   └── oauth.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── oauth.service.ts
│   │   │   ├── token.service.ts
│   │   │   └── twoFactor.service.ts
│   │   ├── utils/
│   │   │   ├── encryption.util.ts
│   │   │   ├── validation.util.ts
│   │   │   └── logger.util.ts
│   │   ├── types/
│   │   │   ├── express.d.ts
│   │   │   └── auth.types.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── tests/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── forgot-password/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── reset-password/
│   │   │   │       └── page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── profile/
│   │   │   │       └── page.tsx
│   │   │   ├── api/
│   │   │   │   └── auth/
│   │   │   │       └── [...nextauth]/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   ├── OAuthButtons.tsx
│   │   │   │   └── TwoFactorForm.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Sidebar.tsx
│   │   │   └── ui/
│   │   │       ├── Button.tsx
│   │   │       ├── Input.tsx
│   │   │       └── Card.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useUser.ts
│   │   │   └── useOAuth.ts
│   │   ├── lib/
│   │   │   ├── axios.ts
│   │   │   ├── auth.ts
│   │   │   └── utils.ts
│   │   ├── store/
│   │   │   ├── authStore.ts
│   │   │   └── userStore.ts
│   │   ├── types/
│   │   │   ├── auth.types.ts
│   │   │   └── user.types.ts
│   │   └── schemas/
│   │       ├── auth.schema.ts
│   │       └── user.schema.ts
│   ├── public/
│   ├── Dockerfile
│   ├── .env.local.example
│   ├── next.config.js
│   ├── package.json
│   ├── tailwind.config.ts
│   └── tsconfig.json
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── .gitignore
├── .env.example
└── README.md
```

## 🚀 البدء السريع

### المتطلبات الأساسية

- Node.js 20+
- Docker & Docker Compose
- Git

### التثبيت

1. **استنساخ المشروع**

```bash
git clone https://github.com/yourusername/secureauth-pro.git
cd secureauth-pro
```

2. **إعداد ملفات البيئة**

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local
```

3. **تحديث متغيرات البيئة**

**Backend (.env):**

```env
# Server
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# Database
MONGODB_URI=mongodb://mongodb:27017/secureauth
MONGODB_URI_TEST=mongodb://mongodb:27017/secureauth_test

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# OAuth - Google
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# OAuth - GitHub
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback

# OAuth - Facebook
FACEBOOK_CLIENT_ID=your-facebook-app-id
FACEBOOK_CLIENT_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5000/api/auth/facebook/callback

# Email (Nodemailer)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=noreply@secureauth.com

# Frontend URL
FRONTEND_URL=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
```

**Frontend (.env.local):**

```env
# API
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_APP_URL=http://localhost:3000

# OAuth (for client-side redirects)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_GITHUB_CLIENT_ID=your-github-client-id
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your-facebook-app-id
```

4. **تشغيل المشروع باستخدام Docker**

```bash
# Development mode
docker-compose -f docker-compose.dev.yml up --build

# Production mode
docker-compose up --build -d
```

5. **الوصول للتطبيق**

- Frontend: <http://localhost:3000>
- Backend API: <http://localhost:5000>
- API Docs: <http://localhost:5000/api-docs>

## 🔧 التطوير المحلي (بدون Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 📚 API Endpoints

### Authentication

```
POST   /api/auth/register          - تسجيل مستخدم جديد
POST   /api/auth/login             - تسجيل الدخول
POST   /api/auth/logout            - تسجيل الخروج
POST   /api/auth/refresh           - تجديد Access Token
POST   /api/auth/forgot-password   - نسيت كلمة المرور
POST   /api/auth/reset-password    - إعادة تعيين كلمة المرور
POST   /api/auth/verify-email      - تفعيل البريد الإلكتروني
GET    /api/auth/me                - الحصول على بيانات المستخدم الحالي
```

### OAuth

```
GET    /api/auth/google            - بدء OAuth مع Google
GET    /api/auth/google/callback   - Callback من Google
GET    /api/auth/github            - بدء OAuth مع GitHub
GET    /api/auth/github/callback   - Callback من GitHub
GET    /api/auth/facebook          - بدء OAuth مع Facebook
GET    /api/auth/facebook/callback - Callback من Facebook
```

### Two-Factor Authentication

```
POST   /api/auth/2fa/enable        - تفعيل 2FA
POST   /api/auth/2fa/verify        - التحقق من 2FA
POST   /api/auth/2fa/disable       - إلغاء 2FA
```

### User Management

```
GET    /api/users/profile          - الحصول على الملف الشخصي
PUT    /api/users/profile          - تحديث الملف الشخصي
PUT    /api/users/password         - تغيير كلمة المرور
GET    /api/users/sessions         - الحصول على الجلسات النشطة
DELETE /api/users/sessions/:id     - حذف جلسة محددة
DELETE /api/users/sessions         - حذف جميع الجلسات
```

## 🧪 الاختبارات

```bash
# Backend tests
cd backend
npm test
npm run test:watch
npm run test:coverage

# Frontend tests
cd frontend
npm test
npm run test:e2e
```

## 🐳 أوامر Docker المفيدة

```bash
# إيقاف جميع الحاويات
docker-compose down

# إيقاف وحذف البيانات
docker-compose down -v

# إعادة البناء
docker-compose up --build

# عرض السجلات
docker-compose logs -f

# الدخول إلى حاوية معينة
docker-compose exec backend sh
docker-compose exec frontend sh
```

## 🔐 الأمان

- ✅ Password hashing مع bcrypt (12 rounds)
- ✅ JWT tokens مع expiry
- ✅ Refresh token rotation
- ✅ Rate limiting على جميع الـ endpoints
- ✅ CORS configuration
- ✅ Helmet.js للأمان
- ✅ XSS protection
- ✅ CSRF tokens
- ✅ HTTP-only cookies
- ✅ Input validation مع Zod
- ✅ SQL injection protection (Mongoose)
- ✅ Two-Factor Authentication

## 📦 Scripts متاحة

### Backend

```json
{
  "dev": "تشغيل في وضع التطوير",
  "build": "بناء للإنتاج",
  "start": "تشغيل في وضع الإنتاج",
  "test": "تشغيل الاختبارات",
  "lint": "فحص الكود",
  "format": "تنسيق الكود"
}
```

### Frontend

```json
{
  "dev": "تشغيل في وضع التطوير",
  "build": "بناء للإنتاج",
  "start": "تشغيل في وضع الإنتاج",
  "lint": "فحص الكود",
  "test": "تشغيل الاختبارات"
}
```

## 🤝 المساهمة

1. Fork المشروع
2. إنشاء branch للميزة (`git checkout -b feature/AmazingFeature`)
3. Commit التغييرات (`git commit -m 'Add some AmazingFeature'`)
4. Push للـ branch (`git push origin feature/AmazingFeature`)
5. فتح Pull Request

## 📝 الترخيص

MIT License - انظر ملف [LICENSE](LICENSE) للتفاصيل

## 👨‍💻 المطور

**Mahmoud - MWM Development Agency**

- GitHub: [@yourusername](https://github.com/yourusername)
- Email: <your.email@example.com>

## 🙏 شكر وتقدير

- [Next.js](https://nextjs.org/)
- [Express.js](https://expressjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Passport.js](http://www.passportjs.org/)

---

⭐ إذا أعجبك المشروع، لا تنسى وضع نجمة!
