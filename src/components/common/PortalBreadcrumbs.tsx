/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * RoadRisk Delhi - Standard Portal Breadcrumbs
 */

import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export default function PortalBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="w-full bg-[#F0F4F8] border-b border-[#D6DCE5] py-2 px-4 sm:px-6 text-xs text-[#4A5668]">
      <ol className="max-w-[1440px] mx-auto flex items-center gap-1.5 flex-wrap">
        <li>
          <Link to="/" className="text-[#12356B] hover:underline font-medium">
            Home
          </Link>
        </li>
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" aria-hidden="true" />
              {item.path && !isLast ? (
                <Link to={item.path} className="text-[#12356B] hover:underline font-medium">
                  {item.label}
                </Link>
              ) : (
                <span className="text-[#1B2430] font-semibold" aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
