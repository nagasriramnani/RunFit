const TEAL = "#00E5C8";
const TEAL_DIM = "rgba(0,229,200,0.15)";
const TEAL_MID = "rgba(0,229,200,0.35)";
const RED = "#FF3D57";
const RED_DIM = "rgba(255,61,87,0.15)";
const ORANGE = "#FF8C42";
const PURPLE = "#A855F7";
const BG = "#0A0A0F";
const BG2 = "#13131A";
const BG3 = "#1C1C26";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#F0F0F8";
const TEXT2 = "rgba(240,240,248,0.5)";
const TEXT3 = "rgba(240,240,248,0.25)";

export const Colors = {
  teal: TEAL,
  tealDim: TEAL_DIM,
  tealMid: TEAL_MID,
  red: RED,
  redDim: RED_DIM,
  orange: ORANGE,
  purple: PURPLE,
  bg: BG,
  bg2: BG2,
  bg3: BG3,
  border: BORDER,
  text: TEXT,
  text2: TEXT2,
  text3: TEXT3,
};

export const ZoneColors = [
  { fill: "rgba(0,229,200,0.3)", stroke: "#00E5C8", name: "Teal" },
  { fill: "rgba(168,85,247,0.3)", stroke: "#A855F7", name: "Purple" },
  { fill: "rgba(255,140,66,0.3)", stroke: "#FF8C42", name: "Orange" },
  { fill: "rgba(255,61,87,0.3)", stroke: "#FF3D57", name: "Red" },
  { fill: "rgba(59,130,246,0.3)", stroke: "#3B82F6", name: "Blue" },
  { fill: "rgba(34,197,94,0.3)", stroke: "#22C55E", name: "Green" },
];

export default {
  light: {
    text: TEXT,
    background: BG,
    tint: TEAL,
    tabIconDefault: TEXT3,
    tabIconSelected: TEAL,
  },
  dark: {
    text: TEXT,
    background: BG,
    tint: TEAL,
    tabIconDefault: TEXT3,
    tabIconSelected: TEAL,
  },
};
