<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Web Design Guideline (Vercel Aesthetic Theme)

Always follow the design tokens defined in `frontend/DESIGN.md` for this project:
- **Colors**:
  - Primary / Ink: `#171717` (used for primary CTAs and default text)
  - Canvas: `#ffffff` (for cards, inputs, dropdowns)
  - Canvas Soft: `#fafafa` (default page background)
  - Canvas Soft 2: `#f5f5f5` (deeper inset areas and hover highlights)
  - Hairline: `#ebebeb` (1px borders and separators)
  - Link / Success: `#0070f3` (primary link color)
- **Visual Rhythm**:
  - Sentence-case headlines, period-terminated.
  - Tightly tracked display headlines (e.g., `tracking-[-2.4px]` on Display XL).
  - Use `vercel-card-shadow` and `vercel-card-shadow-hover` helper classes for all Card components (which combine inset borders and stacked small shadows rather than single heavy blurred drops).
  - Atmosphere backgrounds use `vercel-mesh-gradient` (stretching radial gradients of develop, preview, and ship colors).
