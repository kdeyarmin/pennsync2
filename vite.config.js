import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  logLevel: 'error', // Suppress warnings, only show errors
  // HIPAA: strip all console.* and debugger statements from PRODUCTION builds.
  // The app logs entities/responses/transcripts in many places, and anything left
  // in the shipped bundle executes in the clinician/patient browser (devtools,
  // extensions, error collectors) and leaks PHI. Dev (`command === 'serve'`)
  // keeps logs so local debugging is unaffected.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'] } : {},
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true'
    }),
    react(),
  ]
}));