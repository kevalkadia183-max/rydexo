/**
 * Web stub for react-native-maps.
 * On web, GPS-based map views are replaced by a simple placeholder.
 */
const React = require('react');
const { View, Text, StyleSheet } = require('react-native');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
  },
  text: {
    color: '#00D4FF',
    fontSize: 14,
    opacity: 0.6,
  },
});

function MapPlaceholder(props) {
  return React.createElement(
    View,
    { style: [styles.container, props.style] },
    React.createElement(Text, { style: styles.text }, '🗺  Map view (native only)')
  );
}

MapPlaceholder.Animated = MapPlaceholder;

const Marker = () => null;
const Polyline = () => null;
const Circle = () => null;
const Callout = () => null;
const PROVIDER_GOOGLE = 'google';
const PROVIDER_DEFAULT = null;

module.exports = MapPlaceholder;
module.exports.default = MapPlaceholder;
module.exports.Marker = Marker;
module.exports.Polyline = Polyline;
module.exports.Circle = Circle;
module.exports.Callout = Callout;
module.exports.PROVIDER_GOOGLE = PROVIDER_GOOGLE;
module.exports.PROVIDER_DEFAULT = PROVIDER_DEFAULT;
