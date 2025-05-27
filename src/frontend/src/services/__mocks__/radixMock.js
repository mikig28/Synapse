const React = require('react');

// A simple mock for Radix UI Slot component
// It just renders its children, which is often sufficient for testing components that use Slot.
const Slot = React.forwardRef((props, ref) => {
  const { children, ...otherProps } = props;
  // If you need to pass ref down to a specific child, you might need a more complex mock
  // or ensure the child can accept a ref. For basic rendering, this is usually fine.
  return React.createElement(React.Fragment, otherProps, children);
});

module.exports = { Slot };
