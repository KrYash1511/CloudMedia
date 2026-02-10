import Link from "next/link";
import {
  CloudUpload,
  Zap,
  Shield,
  ArrowRight,
  FileVideo,
  ImageIcon,
  Repeat,
  Sparkles,
  LayoutDashboard,
  Download,
  Lock,
  Shrink,
  FileImage,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-base-100">
      {/* ── Navbar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass-pane border-b border-base-300/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-5 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold tracking-tight"
          >
            <CloudUpload className="w-6 h-6 text-primary" />
            <span>
              Cloud<span className="text-primary">Media</span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="btn btn-ghost btn-sm rounded-xl font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="btn btn-primary btn-sm rounded-xl font-medium"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* decorative blobs */}
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-[400px] h-[400px] rounded-full bg-secondary/10 blur-[100px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center px-5 pt-24 pb-20 lg:pt-36 lg:pb-28">
          <span className="badge-soon mb-6 inline-flex">Beta &middot; Free to use</span>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Compress, Convert &amp; Resize{" "}
            <span className="gradient-text">All Your Media</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg md:text-xl opacity-75 leading-relaxed mb-10">
            A cloud-powered toolkit for images, videos and PDFs. Compress to any
            target size, convert between formats, resize for social platforms
            &mdash; all from your browser with zero installs.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/sign-up"
              className="btn btn-primary btn-lg rounded-2xl gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
            >
              Start Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/sign-in"
              className="btn btn-ghost btn-lg rounded-2xl border border-base-300"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      <div className="section-divider mx-auto w-4/5" />

      {/* ── Core tools ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary mb-3">
          What you can do
        </p>
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-14">
          Four tools, one platform
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: Shrink,
              title: "Compress Media",
              desc: "Shrink images, videos and PDFs. Set an exact target size or let our engine pick the best quality automatically.",
            },
            {
              icon: Repeat,
              title: "Convert",
              desc: "Image format conversion, images to PDF, PDF to images, and video to audio — all in one place.",
            },
            {
              icon: FileImage,
              title: "Resize Image",
              desc: "Resize and crop images to fit every major social platform in a single click.",
            },
            {
              icon: LayoutDashboard,
              title: "Dashboard",
              desc: "View your full compression history, preview results with video hover playback, and download anytime.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="card-hover rounded-2xl border border-base-300/60 bg-base-200/40 p-8"
            >
              <item.icon className="w-9 h-9 text-primary mb-4" />
              <h3 className="text-lg font-bold mb-2">{item.title}</h3>
              <p className="opacity-70 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────── */}
      <section className="bg-base-200/50 py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            How it works
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-14">
            Three steps to optimised media
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: CloudUpload,
                title: "Upload",
                desc: "Pick any image, video or PDF (up to 100 MB for video). We handle the rest in the cloud.",
              },
              {
                step: "02",
                icon: Zap,
                title: "Process",
                desc: "Compress, convert or resize — choose your tool and optionally set a target size. Processing happens on fast cloud servers.",
              },
              {
                step: "03",
                icon: Download,
                title: "Download",
                desc: "Grab the result instantly. All files are tied to your private account — only you can see them.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="card-hover rounded-2xl border border-base-300/60 bg-base-100 p-8"
              >
                <span className="text-5xl font-black opacity-10 leading-none">
                  {item.step}
                </span>
                <item.icon className="w-8 h-8 text-primary mt-4 mb-3" />
                <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                <p className="opacity-70 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features grid ──────────────────────────────────── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-6xl mx-auto px-5">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-primary mb-3">
            Platform highlights
          </p>
          <h2 className="text-3xl lg:text-4xl font-bold text-center mb-14">
            Why CloudMedia?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: FileVideo,
                title: "Video Compression",
                desc: "Target a specific file size or let best-quality mode choose the optimal bitrate automatically.",
              },
              {
                icon: ImageIcon,
                title: "Image & PDF Compression",
                desc: "Reduce image and PDF sizes with adjustable quality — great for email, web and print.",
              },
              {
                icon: Repeat,
                title: "Format Conversion",
                desc: "Convert between PNG, JPG, WebP and more. Turn images into PDF or extract pages as images. Extract audio from video.",
              },
              {
                icon: Lock,
                title: "Private & Secure",
                desc: "Every file is tied to your account. Nobody else can see or download your media.",
              },
              {
                icon: Shield,
                title: "Cloud-Powered",
                desc: "Processing happens on fast cloud servers — zero CPU load on your machine.",
              },
              {
                icon: Sparkles,
                title: "Compression History",
                desc: "Your dashboard tracks every compression with size stats, preview thumbnails and hover video playback.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="card-hover rounded-2xl border border-base-300/60 bg-base-100 p-7"
              >
                <f.icon className="w-9 h-9 text-primary mb-4" />
                <h3 className="font-bold text-base mb-1">{f.title}</h3>
                <p className="text-sm opacity-70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="section-divider mx-auto w-4/5" />

      {/* ── About ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-5 py-20 lg:py-28 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary mb-3">
          About the platform
        </p>
        <h2 className="text-3xl lg:text-4xl font-bold mb-8">
          Why CloudMedia exists
        </h2>
        <p className="text-base md:text-lg opacity-70 leading-relaxed max-w-3xl mx-auto">
          CloudMedia is a Cloudinary-powered SaaS toolkit for everyday media
          tasks. Sign up, upload an image, video or PDF, and compress it to a
          target size — or let the engine choose the best quality for you.
          Convert between formats, resize images for social platforms, and track
          every result in your private dashboard. No heavy desktop software, no
          CLI tools — just a browser.
        </p>
      </section>

      {/* ── CTA ────────────────────────────────────────────── */}
      <section className="bg-primary/5 py-20 lg:py-24">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold mb-5">
            Ready to optimise your media?
          </h2>
          <p className="text-lg opacity-70 mb-8">
            Create a free account and start compressing, converting and resizing
            in under a minute. No credit card required.
          </p>
          <Link
            href="/sign-up"
            className="btn btn-primary btn-lg rounded-2xl gap-2 shadow-lg shadow-primary/20"
          >
            Create Free Account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-base-300/40 py-10">
        <div className="max-w-7xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm opacity-60">
          <div className="flex items-center gap-2 font-semibold">
            <CloudUpload className="w-5 h-5 text-primary" />
            CloudMedia
          </div>
          <p>&copy; {new Date().getFullYear()} CloudMedia. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/sign-in" className="hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/sign-up" className="hover:text-primary transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}