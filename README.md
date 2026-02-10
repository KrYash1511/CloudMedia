# CloudMedia ☁️

**Cloud-Based Media Processing, Made Simple**

CloudMedia is a modern SaaS platform built with Next.js that enables users to upload, compress, and manage their video files in the cloud. No heavy desktop software required—everything happens seamlessly in your browser.

![Beta](https://img.shields.io/badge/status-beta-blue)
![License](https://img.shields.io/badge/license-private-red)

---

## 🚀 Features

### Current Features
- **🎥 Video Compression** - Reduce video file sizes dramatically while preserving visual quality using Cloudinary's optimization engine
- **🖼️ Image Resizer** - Resize and crop images for every social platform in one click
- **🔒 Private & Secure** - Every file is tied to your account with user authentication via Clerk
- **📊 Personal Dashboard** - View, manage, and download all your compressed files in one place
- **⚡ Cloud-Powered Processing** - All processing happens on fast cloud servers—no CPU load on your machine

### Coming Soon
- 🔄 Format Conversion (MP4, WebM, AVI, MOV)
- ✨ Free Tier & Usage Tracking

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) with React 19
- **Language:** TypeScript
- **Authentication:** [Clerk](https://clerk.com/)
- **Media Processing:** [Cloudinary](https://cloudinary.com/)
- **Database:** PostgreSQL with [Prisma ORM](https://www.prisma.io/)
- **Styling:** TailwindCSS 4 + DaisyUI
- **Icons:** Lucide React
- **Deployment Ready:** Optimized for Vercel/cloud platforms

---

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js 20+ installed
- PostgreSQL database
- Cloudinary account ([Sign up here](https://cloudinary.com/))
- Clerk account ([Sign up here](https://clerk.com/))

---

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/KrYash1511/CloudMedia.git
   cd CloudMedia
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/cloudmedia"
   
   # Clerk Authentication
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
   CLERK_SECRET_KEY=your_clerk_secret_key
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   
   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
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

## 📁 Project Structure

```
CloudMedia/
├── app/
│   ├── (app)/          # Protected app routes (dashboard, video upload)
│   ├── (auth)/         # Authentication routes (sign-in, sign-up)
│   ├── api/            # API routes for video processing
│   ├── layout.tsx      # Root layout with Clerk provider
│   ├── page.tsx        # Public landing page
│   └── globals.css     # Global styles
├── components/         # Reusable React components
├── lib/               # Utility functions and configurations
├── prisma/            # Database schema and migrations
│   └── schema.prisma  # Video model definition
├── public/            # Static assets
├── types/             # TypeScript type definitions
└── middleware.ts      # Clerk authentication middleware
```

---

## 🎯 How It Works

1. **Upload** 📤
   - Users sign up or log in via Clerk authentication
   - Drag-and-drop or browse for video files (up to 70 MB)
   - Files are securely uploaded to Cloudinary

2. **Compress** ⚙️
   - Cloudinary automatically optimizes and compresses videos
   - Processing happens entirely in the cloud
   - Original and compressed file sizes are tracked

3. **Download** 📥
   - Access your private dashboard
   - View all your processed videos
   - Download compressed versions anytime
   - Only you can see your files—complete privacy

---

## 🗃️ Database Schema

```prisma
model Video {
  id             String   @id @default(cuid())
  title          String
  description    String?
  publicId       String   // Cloudinary public ID
  originalSize   String
  compressedSize String
  duration       Float
  userId         String   // Clerk user ID
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([userId])
}
```

---

## 🔐 Security

- **Authentication:** Secured with Clerk's industry-standard authentication
- **Authorization:** Middleware ensures users can only access their own files
- **Private Storage:** All media files are associated with user accounts
- **Environment Variables:** Sensitive credentials stored securely

---

## 🚀 Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy!

### Database Setup

Ensure your PostgreSQL database is accessible and the `DATABASE_URL` is correctly configured.

---

## 📝 Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm start        # Start production server
npm run lint     # Run ESLint
```

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary. All rights reserved.

---

## 👤 Author

**KrYash1511**

- GitHub: [@KrYash1511](https://github.com/KrYash1511)

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [Cloudinary](https://cloudinary.com/) - Media optimization platform
- [Clerk](https://clerk.com/) - User authentication
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [TailwindCSS](https://tailwindcss.com/) - Utility-first CSS framework
- [DaisyUI](https://daisyui.com/) - Component library

---

## 📧 Support

For support, questions, or feedback, please open an issue in the repository.

---

<div align="center">
  Made with ❤️ by KrYash1511
</div>
