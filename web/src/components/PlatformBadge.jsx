const PLATFORM_STYLES = {
  gofood: {
    soft: "border-red-200 bg-red-50 text-red-700",
    solid: "border-red-700 bg-red-700 text-white",
  },
  grab: {
    soft: "border-emerald-200 bg-emerald-50 text-emerald-700",
    solid: "border-emerald-700 bg-emerald-700 text-white",
  },
  shopee: {
    soft: "border-orange-200 bg-orange-50 text-orange-700",
    solid: "border-orange-700 bg-orange-700 text-white",
  },
  default: {
    soft: "border-slate-200 bg-slate-50 text-slate-700",
    solid: "border-slate-700 bg-slate-700 text-white",
  },
};

function getPlatformKey(platform = "") {
  const value = platform.toLowerCase();
  if (value.includes("grab")) return "grab";
  if (value.includes("shopee")) return "shopee";
  if (value.includes("gofood") || value === "go") return "gofood";
  return "default";
}

export default function PlatformBadge({ platform, storeId, selected = false, className = "" }) {
  const style = PLATFORM_STYLES[getPlatformKey(platform)];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] font-semibold leading-none ${selected ? style.solid : style.soft} ${className}`}>
      <span>{platform?.toUpperCase()}</span>
      {storeId && <span className="font-medium opacity-65">· {storeId}</span>}
    </span>
  );
}
