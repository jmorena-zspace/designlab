import type { DesignNode } from '../types'

// The React `key` for a rendered layer. It includes the layer's props, so changing a
// prop re-creates the component from scratch. That matters for "uncontrolled" props like
// `defaultChecked` and `defaultValue`: a component only reads them when it first appears,
// so without a fresh start, editing them in the right panel would do nothing.
// Used by node-renderer.tsx (children) and component-frame.tsx (each variant's root).
export function getNodeKey(node: DesignNode): string {
  return `${node.layerKey}|${JSON.stringify(node.props ?? {})}`
}
