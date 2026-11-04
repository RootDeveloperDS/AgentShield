"use client";

import {
  ModuleRegistry,
  AllCommunityModule,
  themeQuartz,
  colorSchemeDarkBlue
} from "ag-grid-community";

// Register all community modules once for the entire application
ModuleRegistry.registerModules([AllCommunityModule]);

// Enterprise dark theme matching AgentShield's fintech cyber-security palette
export const agentShieldDarkTheme = themeQuartz
  .withPart(colorSchemeDarkBlue)
  .withParams({
    backgroundColor: "#0b1524",
    headerBackgroundColor: "#08111e",
    foregroundColor: "#e2e8f0",
    headerTextColor: "#8da6c7",
    borderColor: "#1a2c42",
    rowHoverColor: "#132338",
    selectedRowBackgroundColor: "#172d47"
  });

export { ModuleRegistry, AllCommunityModule };
