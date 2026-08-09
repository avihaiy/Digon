const fs = require('fs');
let code = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

// Import AutoNightMode
code = code.replace(
  "import { AccessibilityWidget } from './AccessibilityWidget';",
  "import { AccessibilityWidget } from './AccessibilityWidget';\nimport { AutoNightMode } from '@/components/AutoNightMode';"
);

// Inject into layout
code = code.replace(
  "export default function AppLayout({ children }: AppLayoutProps) {",
  "export default function AppLayout({ children }: AppLayoutProps) {\n  // Render AutoNightMode silently in the background"
);

code = code.replace(
  "<div className=\"min-h-screen flex\">",
  "<div className=\"min-h-screen flex\">\n      <AutoNightMode />"
);

fs.writeFileSync('src/components/layout/AppLayout.tsx', code);
