// legacy:nn-rename/quarantine

export type {
  DomainReader,
  LegacySignal,
  LegacySignalType,
  DetectLegacyResult,
} from './detect.js'
export { detectLegacy } from './detect.js'
export { detectLegacyLayout, RETIRED_LAYOUT_FOLDERS } from './layout/detect.js'
