import { defineConfig } from 'vite';

export default defineConfig( () => {
	return {
		build: {
			outDir: 'out',
			emptyOutDir: false,
			lib: {
				entry: './src/demo-mcp-server.ts',
				name: 'Angie Demo',
				fileName: 'angie-demo',
			},
			minify: false,
		},
	};
} );
