import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import { TanStackRouterVite } from '@tanstack/router-plugin/vite';

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		TanStackRouterVite({
			target: 'react',
			autoCodeSplitting: true,
		}),
		viteTsConfigPaths({
			projects: ['./tsconfig.json'],
		}),
		tailwindcss(),
		react(),
	],
	// Base path for GitHub Pages project site
	// For project sites (username.github.io/repo-dashboard), use '/repo-dashboard/'
	base: '/repo-dashboard/',
	build: {
		outDir: 'dist',
		emptyOutDir: true,
	},
});
