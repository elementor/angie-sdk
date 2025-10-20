// Mock for CSS ?raw imports in Jest
// This returns a string that simulates the raw CSS content
module.exports = `
/* Mock CSS content for testing */
:root {
  --angie-sidebar-width: 330px;
}
body.angie-sidebar-active {
  padding-inline-start: var(--angie-sidebar-width) !important;
}
#angie-sidebar-container {
  position: fixed;
  top: 0;
  inset-inline-start: 0;
  width: var(--angie-sidebar-width);
  height: 100vh;
  background: #FCFCFC;
}
`;
