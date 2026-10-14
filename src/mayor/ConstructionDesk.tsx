import { ArrowRight, Clock3, HardHat, TriangleAlert } from "lucide-react";
import { city, getConstructionIssues, getConstructionProgress } from "./engine";
import { projectById, requestById } from "./catalog";

export default function ConstructionDesk({
  onOpenRequest,
}: {
  onOpenRequest: (id: string) => void;
}) {
  const sites = city.projects.filter((p) => p.status === "building");
  if (!sites.length) return null;
  const issues = getConstructionIssues();
  return (
    <section
      className="civic-works-desk"
      aria-label="Active construction sites"
    >
      <header>
        <span className="civic-works-emblem">
          <HardHat size={22} />
        </span>
        <div>
          <span className="civic-eyebrow">ON SITE, TODAY</span>
          <h2>The city is taking shape.</h2>
          <p>Work crews, opening dates, and the problems that need a mayor.</p>
        </div>
        <span
          className={`civic-works-count ${issues.length ? "attention" : ""}`}
        >
          {issues.length
            ? `${issues.length} site ${issues.length === 1 ? "issue" : "issues"} to review`
            : "Every site has a plan"}
        </span>
      </header>
      <div className="civic-works-sites">
        {sites.map((project) => {
          const definition = projectById[project.definitionId];
          const open = getConstructionIssues(project.definitionId);
          const progress = Math.round(getConstructionProgress(project) * 100);
          return (
            <article
              key={project.definitionId}
              className={open.length ? "needs-attention" : ""}
            >
              <div className="civic-works-site-heading">
                <span>
                  {
                    city.districts.find((d) => d.id === definition.district)
                      ?.name
                  }
                </span>
                <b>{progress}%</b>
              </div>
              <h3>{definition.name}</h3>
              <div
                className="civic-works-meter"
                role="progressbar"
                aria-label={`${definition.name} construction`}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${progress}%` }} />
              </div>
              <p>
                <Clock3 size={12} /> Expected day{" "}
                {Math.floor(project.completesDay)}
                {(project.delayDays ?? 0) > 0 && (
                  <strong>+{project.delayDays} days of delay</strong>
                )}
              </p>
              {project.inherited && (
                <small>
                  Contract funded before your term. Opening adds $
                  {definition.upkeep}/day upkeep.
                </small>
              )}
              <div className="civic-works-issues">
                {open.length ? (
                  open.map((issue) => (
                    <button
                      key={issue.id}
                      onClick={() => onOpenRequest(issue.id)}
                    >
                      <TriangleAlert size={14} />
                      <span>
                        {requestById[issue.templateId].title}
                        <small>
                          Decision due day {Math.floor(issue.dueDay)}
                        </small>
                      </span>
                      <ArrowRight size={14} />
                    </button>
                  ))
                ) : (
                  <span className="civic-works-clear">
                    Crew at work · no outstanding site issues
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
