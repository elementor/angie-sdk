import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseConfig = {
  entry: './src/index.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/i,
        use: 'raw-loader',
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  externals: [
    /^@modelcontextprotocol\/sdk\/.*/
  ],
  mode: 'production',
  optimization: {
    minimize: true,
  },
};

const esmConfig = {
  ...baseConfig,
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'module',
    },
    environment: {
      module: true,
    },
    clean: true,
  },
  experiments: {
    outputModule: true,
  },
};

const cjsConfig = {
  ...baseConfig,
  output: {
    filename: 'index.cjs',
    path: path.resolve(__dirname, 'dist'),
    library: {
      type: 'commonjs2',
    },
    clean: false,
  },
};

export default [esmConfig, cjsConfig];
