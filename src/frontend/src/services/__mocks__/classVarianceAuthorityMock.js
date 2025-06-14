// Mock for class-variance-authority
const cva = (base, config) => {
  // Return a dummy function that might be called with props to get class names
  return (props) => {
    // In a real scenario, cva returns a string of class names.
    // For a mock, returning a static string or a combination based on props is fine.
    // This simplified version just returns a base string.
    return 'mock-cva-class';
  };
};

// VariantProps is a type, so it doesn't strictly need a runtime mock,
// but exporting an empty object for completeness if something tries to import it.
const VariantProps = {};

module.exports = {
  cva,
  VariantProps,
};
