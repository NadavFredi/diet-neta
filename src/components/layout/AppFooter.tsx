import React from "react"
import { cn } from "@/lib/utils"

interface FooterContentProps {
    className?: string;
    compact?: boolean;
    hideLink?: boolean;
    smallImage?: boolean;
    isCollapsed?: boolean;
}

export function FooterContent({ className, compact = false, hideLink = false, smallImage = false, isCollapsed = false }: FooterContentProps = {}) {
    // When collapsed, show only the image with no padding
    if (isCollapsed) {
        return (
            <div
                className={cn("text-white flex items-center justify-center", className)}
                style={{
                    backgroundColor: "#5B6FB9",
                }}
                dir="rtl"
            >
                <a
                    href="https://easyflow.co.il"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cursor-pointer flex-shrink-0"
                >
                    <img
                        src="/easyflow-logo.png"
                        alt="Easyflow logo"
                        className="h-16 w-16 object-contain"
                    />
                </a>
            </div>
        );
    }

    return (
        <div
            className={cn("text-white", className)}
            style={{
                backgroundColor: "#5B6FB9",
            }}
            dir="rtl"
        >
            <div className={cn(
                "flex flex-col items-center justify-between gap-4",
                compact ? "px-4 py-4" : "mx-auto max-w-5xl px-6 py-6",
                compact ? "" : "md:flex-row"
            )}>
                <div className={cn(
                    "flex items-center gap-3",
                    compact ? "gap-3" : "md:flex-row"
                )}>
                    <a
                        href="https://easyflow.co.il"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cursor-pointer flex-shrink-0"
                    >
                        <img
                            src="/easyflow-logo.png"
                            alt="Easyflow logo"
                            className={smallImage ? "h-16 w-16 object-contain" : "h-10 w-auto"}
                        />
                    </a>
                    <div className="text-right text-sm md:text-base">
                        <p className="font-semibold">Easy Flow</p>
                        <p className="text-[11px] opacity-90 leading-tight">
                            פתרונות טכנולוגיים, אוטומציה, וCRM לעסקים חכמים
                        </p>
                    </div>
                </div>
                {!hideLink && (
                    <a
                        href="https://easyflow.co.il"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium underline-offset-4 hover:underline md:text-base"
                    >
                        Easyflow.co.il
                    </a>
                )}
            </div>
        </div>
    )
}

interface AppFooterProps {
    className?: string;
}

export function AppFooter({ className }: AppFooterProps = {}) {
    return (
        <footer className={cn("mt-10", className)} dir="rtl">
            <FooterContent />
        </footer>
    )
}
