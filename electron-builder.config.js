module.exports = {
  appId: 'com.urban-dds.desktop',
  productName: 'Urban-DDS',
  asar: false,
  directories: {
    buildResources: 'build',
    output: 'dist',
  },
  files: [
    'electron/**/*',
    '.next/**/*',
    'public/**/*',
    'package.json',
  ],
  extraMetadata: {
    main: 'electron/main.js',
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64'],
      },
    ],
  },
  mac: {
    category: 'public.app-category.developer-tools',
    target: ['dmg'],
  },
  linux: {
    target: ['AppImage'],
    category: 'Utility',
  },
};
