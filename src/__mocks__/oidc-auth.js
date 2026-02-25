module.exports = {
  isOidcFlowInUrl: jest.fn(() => false),
  setupOidcAuthParentListener: jest.fn(),
  forwardOidcLoginFlowToWindow: jest.fn(),
};
