import "./globals.css";

export const metadata = {
  title: "FoodMaster Menu Portal",
  description: "Pull and push menus across multiple applicator platforms.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100">
        {children}
      </body>
    </html>
  );
}
