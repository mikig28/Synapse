const React = require('react');

// Generic mock for all lucide-react icons
// Returns a simple span with the icon name for easier debugging if needed,
// or just a generic SVG placeholder.
const lucideIconMock = (props) => {
  // You can get the icon name from props if they are passed consistently,
  // but for a generic mock, just returning a placeholder is fine.
  // const iconName = props.name || 'lucide-icon';
  // return React.createElement('span', null, iconName);
  return React.createElement('svg', { 'data-testid': 'lucide-icon-mock', ...props });
};

// It's common for lucide-react to export icons as named exports.
// We can use a Proxy to dynamically return our mock for any icon requested.
module.exports = new Proxy({}, {
  get: function(target, prop) {
    if (prop === '__esModule') {
      return false; // Indicate it's not an ES module if that helps Jest
    }
    // Return the generic mock for any icon name
    return lucideIconMock;
  }
});
