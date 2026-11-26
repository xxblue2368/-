import { getSelectedAiCandidates, type AiCandidateSelections } from '../../data/aiCandidates';

export function SeasonalLookbook({ selections }: { selections: AiCandidateSelections }) {
  return (
    <div className="seasonal-lookbook">
      {getSelectedAiCandidates(selections).map((candidate) => (
        <figure key={candidate.id}>
          <img
            src={candidate.imageUrl}
            alt={`${candidate.seasonLabel} ${candidate.styleLabel} 착장`}
            loading="lazy"
            decoding="async"
          />
          <figcaption>{candidate.seasonLabel}</figcaption>
        </figure>
      ))}
    </div>
  );
}
