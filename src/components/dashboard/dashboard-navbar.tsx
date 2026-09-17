"use client";

/*
 * DashboardNavbar — animated top navigation for the authenticated app.
 *
 * - Sticky with a translucent backdrop blur that deepens on scroll.
 * - Active link carries an animated underline + soft amber glow.
 * - Mobile: hamburger opens a sheet that slides in with staggered items.
 * - Avatar triggers a dropdown with a scale/opacity pop.
 *
 * All motion respects prefers-reduced-motion (DESIGN.md a11y).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

import styles from "./dashboard-navbar.module.css";

type NavItem = { label: string; href: string };

const NAV_ITEMS: NavItem[] = [
  { label: "Resumes",    href: "/dashboard" },
  { label: "Builder",    href: "/dashboard/builder" },
  { label: "Interview",  href: "/dashboard/interview" },
  { label: "GitHub",     href: "/dashboard/github" },
  { label: "Practice",   href: "/dashboard/practice" },
  { label: "Roadmap",    href: "/dashboard/roadmap" },
  { label: "Mentor",     href: "/dashboard/mentor" },
  { label: "Progress",   href: "/dashboard/progress" },
];

export default function DashboardNavbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  // WHY track scroll: swap the header from airy to a solid blurred bar after 8px.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // WHY close menus on route change: a nav tap that navigates shouldn't leave
  // the mobile sheet or user dropdown open on the next page.
  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [pathname]);

  // WHY Escape handler: keyboard users can dismiss the dropdown without clicking.
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") { setUserOpen(false); setMenuOpen(false); }
  }, []);
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href);

  return (
    <header
      className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}
      role="banner"
    >
      <nav className={styles.nav} aria-label="Primary">
        {/* Brand — bobs gently on hover */}
        <Link href="/" className={styles.brand} aria-label="CareerPilot home">
          <span className={styles.brandMark} aria-hidden="true">
            C
          </span>
          <span className={styles.brandText}>CareerPilot</span>
        </Link>

        {/* Desktop links */}
        <ul className={styles.linkList}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`${styles.link} ${active ? styles.linkActive : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span>{item.label}</span>
                  <span className={styles.underline} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right cluster: user dropdown + mobile toggle */}
        <div className={styles.right}>
          <div className={styles.userWrap}>
            <button
              type="button"
              className={styles.avatar}
              aria-expanded={userOpen}
              aria-haspopup="menu"
              onClick={() => setUserOpen((v) => !v)}
            >
              <span aria-hidden="true">U</span>
              <span className={styles.avatarRing} aria-hidden="true" />
            </button>

            {userOpen && (
              <div className={styles.dropdown} role="menu">
                <Link href="/dashboard/target" role="menuitem" className={styles.dropdownItem}>
                  Target company
                </Link>
                <div className={styles.dropdownDivider} />
                <form action="/api/auth/signout" method="POST">
                  <button type="submit" role="menuitem" className={styles.dropdownItem}>
                    Sign out
                  </button>
                </form>
              </div>
            )}
          </div>

          <button
            type="button"
            className={`${styles.hamburger} ${menuOpen ? styles.hamburgerOpen : ""}`}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label="Toggle navigation menu"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </nav>

      {/* Mobile sheet */}
      {menuOpen && (
        <div id="mobile-nav" className={styles.mobileSheet} role="menu">
          {NAV_ITEMS.map((item, i) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.mobileLink} ${active ? styles.linkActive : ""}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
