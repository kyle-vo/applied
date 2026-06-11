import { NavLink } from "react-router-dom";
import { UserButton } from "@clerk/clerk-react";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/applications", label: "Applications" },
  { to: "/analysis", label: "AI Analysis" },
  { to: "/settings", label: "Settings" },
];

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <span className="font-semibold text-gray-900 tracking-tight">
            Applied
          </span>
          <div className="flex items-center gap-1">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-gray-100 text-gray-900"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>
        </div>
        <UserButton afterSignOutUrl="/" />
      </div>
    </nav>
  );
}
