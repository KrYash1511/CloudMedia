# ☁️ CloudMedia

> A cloud-powered SaaS toolkit for compressing, converting, and resizing media files — all from your browser.

[![Next.js](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Powered-3448C5?logo=cloudinary)](https://cloudinary.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## ✨ Features

CloudMedia is a **Cloudinary-powered platform** that brings professional media processing tools to your browser — no heavy desktop software or CLI tools required.

### 🎯 Core Capabilities

- **📦 Compress Media**: Shrink images, videos, and PDFs to exact target sizes (KB/MB) or let the engine choose optimal quality
- **🔄 Convert**: Transform between formats with ease
  - Image format conversion (PNG, JPG, WEBP, etc.)
  - Multiple images to PDF
  - PDF to images (extract pages)
  - Video to audio extraction
- **📐 Resize Image**: Crop and resize images for social media platforms in one click
  - Instagram (Square, Portrait, Story)
  - X/Twitter posts
  - And more preset formats
- **📊 Dashboard**: Track your full compression history with video hover playback and download anytime

### 🔐 Built-in Features

- 🔒 Secure authentication with Firebase
- 👤 Private user accounts — only you can see your files
- ⚡ Cloud-based processing for fast results
- 🎨 Modern UI with DaisyUI and Tailwind CSS
- 📱 Fully responsive design

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **npm** / **yarn** / **pnpm** / **bun**
- **PostgreSQL** database
- **Cloudinary** account ([Sign up free](https://cloudinary.com/))
- **Firebase** project for authentication ([Sign up free](https://firebase.google.com/))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KrYash1511/CloudMedia.git
   cd CloudMedia
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/cloudmedia"

   # Firebase Authentication
   NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # Cloudinary
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **[Next.js 16](https://nextjs.org/)** | React framework with App Router |
| **[TypeScript](https://www.typescriptlang.org/)** | Type-safe development |
| **[Cloudinary](https://cloudinary.com/)** | Media processing & transformation |
| **[Ghostscript](https://www.ghostscript.com/)** | PDF compression engine |
| **[Firebase](https://firebase.google.com/)** | Authentication & user management |
| **[Prisma](https://www.prisma.io/)** | Type-safe ORM for PostgreSQL |
| **[PostgreSQL](https://www.postgresql.org/)** | Relational database |
| **[Tailwind CSS](https://tailwindcss.com/)** | Utility-first CSS framework |
| **[DaisyUI](https://daisyui.com/)** | Tailwind component library |
| **[Lucide React](https://lucide.dev/)** | Icon library |
| **[React Image Crop](https://github.com/DominicTobias/react-image-crop)** | Interactive cropping |
| **[pdf-lib](https://pdf-lib.js.org/)** | PDF manipulation |
| **[JSZip](https://stuk.github.io/jszip/)** | ZIP file generation |

---

## 📁 Project Structure

```
CloudMedia/
├── app/                      # Next.js App Router
│   ├── (app)/               # Authenticated routes
│   │   ├── compress-media/  # Compression tool
│   │   ├── convert/         # Format conversion
│   │   ├── resize-image/    # Image resizing
│   │   └── home/            # Dashboard
│   ├── (auth)/              # Auth pages
│   ├── api/                 # API routes
│   └── page.tsx             # Landing page
├── lib/                     # Utility functions
├── prisma/                  # Database schema
├── public/                  # Static assets
└── middleware.ts            # Firebase middleware
```

---

## 🎨 Features in Detail

### 📦 Compress Media

Upload images, videos (up to 100MB), or PDFs and compress them to:
- **Auto mode**: Let the AI choose optimal quality
- **Target size**: Specify exact KB/MB target
- **Format options**: Choose output format during compression

### 🔄 Convert

Four conversion modes:
1. **Image Format**: Convert PNG → JPG, WEBP, etc.
2. **Images to PDF**: Merge multiple images into one PDF
3. **PDF to Images**: Extract all pages as separate images
4. **Video to Audio**: Extract audio tracks (MP3, WAV, M4A)

### 📐 Resize Image

Smart cropping with:
- **Social media presets**: Instagram, Twitter, Facebook, LinkedIn, TikTok, Pinterest
- **Custom dimensions**: Set your own width/height
- **Aspect ratio locking**: Maintain proportions
- **Interactive cropping**: Visual crop tool with drag & drop

### 📊 Dashboard

- View all processed files
- Hover to preview videos
- Download results anytime
- Track original vs. compressed sizes

---

## 🗄️ Database Schema

The app uses Prisma with PostgreSQL. Current schema includes:

```prisma
model Video {
  id             String   @id @default(cuid())
  title          String
  description    String?
  publicId       String
  originalSize   String
  compressedSize String
  duration       Float
  userId         String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}
```

---

## 🚀 Deployment

### Deploy on Vercel

The easiest way to deploy CloudMedia is with [Vercel](https://vercel.com/):

1. Push your code to GitHub
2. Import the project in Vercel
3. Add environment variables (including Firebase config)
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/KrYash1511/CloudMedia)

### Database Setup

For production, use:
- [Vercel Postgres](https://vercel.com/storage/postgres)
- [Supabase](https://supabase.com/)
- [Railway](https://railway.app/)
- [Neon](https://neon.tech/)

---

## 🛠️ Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Run linter
npm run lint

# Generate Prisma client
npm run postinstall
```

### Code Quality

- **ESLint** for code linting
- **TypeScript** for type safety
- **React Compiler** for optimization

---

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API key | ✅ |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain | ✅ |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID | ✅ |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket | ✅ |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID | ✅ |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID | ✅ |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | ✅ |
| `CLOUDINARY_API_KEY` | Cloudinary API key | ✅ |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | ✅ |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **[Cloudinary](https://cloudinary.com/)** for powerful media transformation APIs
- **[Firebase](https://firebase.google.com/)** for seamless authentication
- **[Vercel](https://vercel.com/)** for Next.js and hosting platform

---

## 📧 Contact

**Kumar Yash Raj** - [@KrYash1511](https://github.com/KrYash1511)

Project Link: [https://github.com/KrYash1511/CloudMedia](https://github.com/KrYash1511/CloudMedia)

---

<div align="center">
  
**[⭐ Star this repo](https://github.com/KrYash1511/CloudMedia)** if you find it helpful!

</div>