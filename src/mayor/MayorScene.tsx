import { useEffect, useState, type CSSProperties } from "react";
import MayorWorld from "./MayorWorld";
export { districtCoordinates } from "./MayorWorld";
import { city, getConstructionIssues, getConstructionProgress } from "./engine";
import { projectById, requestById } from "./catalog";
import CivicLandmarks from "./CivicLandmarks";
import type { DistrictId } from "./types";
import type { LivingOverlay, LivingCitySelection } from "./LivingCityWorld";
import type { CityAlert } from "./cityAlerts";

const detailStyle: CSSProperties = {
  position: "absolute",
  left: 12,
  bottom: 138,
  zIndex: 5,
  width: 208,
  maxWidth: "calc(100% - 24px)",
  padding: 13,
  borderRadius: 0,
  background: "rgba(247,249,252,.97)",
  color: "#314258",
  boxShadow: "inset 0 2px #ffffff, 4px 4px #b1bfce",
  border: "2px solid #b1bfce",
  fontSize: 13,
  lineHeight: 1.45,
  pointerEvents: "auto",
};

export default function MayorScene({
  focus,
  focusKey = 0,
  evening = false,
  centerFocus = false,
  onOpenRequest,
  overlay = "none",
  onOpenCityLife,
  alerts,
  onSelectAlert,
  selectedAlertId,
  focusPoint,
  zoomStep,
}: {
  focus?: DistrictId | null;
  focusKey?: number;
  evening?: boolean;
  centerFocus?: boolean;
  onOpenRequest?: (id: string) => void;
  overlay?: LivingOverlay;
  onOpenCityLife?: (selection: LivingCitySelection) => void;
  alerts?: CityAlert[];
  onSelectAlert?: (alert: CityAlert) => void;
  selectedAlertId?: string | null;
  focusPoint?: [number, number] | null;
  zoomStep?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setSelected(null);
    setHovered(null);
  }, [focus, focusKey, centerFocus]);
  const detailId = selected ?? hovered;
  const project = detailId
    ? city.projects.find((p) => p.definitionId === detailId)
    : null;
  const detail = project ? projectById[project.definitionId] : null;
  const progress = project ? getConstructionProgress(project) : 0;
  const issues = project ? getConstructionIssues(project.definitionId) : [];
  const complete = project?.status === "complete";
  const district = detail
    ? city.districts.find((d) => d.id === detail.district)
    : null;
  return (
    <>
      <MayorWorld
        focus={focus}
        focusKey={focusKey}
        centerFocus={centerFocus}
        evening={evening}
        reduced={reduced}
        overlay={overlay}
        onOpenCityLife={onOpenCityLife}
        alerts={alerts}
        onSelectAlert={onSelectAlert}
        selectedAlertId={selectedAlertId}
        focusPoint={focusPoint}
        zoomStep={zoomStep}
        onMiss={() => {
          setSelected(null);
          setHovered(null);
        }}
      >
        <CivicLandmarks
          focus={focus}
          reduced={reduced}
          selected={selected}
          labels={overlay === "none"}
          onSelect={setSelected}
          onHover={setHovered}
        />
      </MayorWorld>
      {detail && (
        <aside
          aria-label="City project details"
          className="civic-site-details"
          style={{ ...detailStyle, pointerEvents: selected ? "auto" : "none" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "start",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <strong style={{ fontSize: 13 }}>{detail.name}</strong>
            {selected && (
              <button
                aria-label={`Close ${detail.name} details`}
                onClick={() => {
                  setSelected(null);
                  setHovered(null);
                }}
                style={{
                  border: 0,
                  padding: "0 2px",
                  background: "transparent",
                  color: "#66768b",
                  fontSize: 17,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            )}
          </div>
          <span
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 11,
              color: complete ? "#54785a" : "#8a7037",
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {complete
              ? "OPEN & SERVING THE CITY"
              : `${Math.round(progress * 100)}% · ${progress < 1 / 3 ? "GROUNDWORK" : progress < 2 / 3 ? "TAKING SHAPE" : "FINISHING TOUCHES"}`}
          </span>
          <p style={{ margin: "7px 0" }}>{detail.description}</p>
          <span style={{ fontSize: 12, color: "#66768b" }}>
            {district?.name} ·{" "}
            {complete
              ? `$${detail.upkeep}/day upkeep`
              : "Benefits begin when it opens"}
          </span>
          {!complete && (
            <div
              style={{
                height: 3,
                marginTop: 9,
                background: "#b1bfce",
                borderRadius: 0,
              }}
            >
              <div
                style={{
                  height: 3,
                  width: `${progress * 100}%`,
                  background: "#8a7037",
                  borderRadius: 0,
                }}
              />
            </div>
          )}
          {!complete && project && (
            <p style={{ margin: "8px 0 0", fontSize: 12 }}>
              Expected day {Math.floor(project.completesDay)}
              {!!project.delayDays &&
                ` · ${project.delayDays} day${project.delayDays === 1 ? "" : "s"} of delay`}
            </p>
          )}
          {selected &&
            issues.map((issue) => (
              <button
                key={issue.id}
                onClick={() => onOpenRequest?.(issue.id)}
                style={{
                  marginTop: 8,
                  padding: "8px 9px",
                  width: "100%",
                  border: "1px solid #d7c9a6",
                  borderRadius: 5,
                  textAlign: "left",
                  fontSize: 12,
                  color: "#8a7037",
                  background: "#f1ead9",
                }}
              >
                Site issue: {requestById[issue.templateId].title} →
              </button>
            ))}
          {selected && onOpenCityLife && (
            <button
              className="civic-secondary"
              style={{ marginTop: 9, width: "100%", justifyContent: "center" }}
              onClick={() =>
                onOpenCityLife({
                  section: "projects",
                  id: detail.id,
                  districtId: detail.district,
                })
              }
            >
              Manage this project →
            </button>
          )}
        </aside>
      )}
    </>
  );
}
