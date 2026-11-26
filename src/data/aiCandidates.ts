import files from './aiCandidateFiles.json';

export const SEASONS = [
  { id: 'SPRING', label: '봄', folder: 'spring' },
  { id: 'SUMMER', label: '여름', folder: 'summer' },
  { id: 'FALL', label: '가을', folder: 'autumn' },
  { id: 'WINTER', label: '겨울', folder: 'winter' },
] as const;

export type Season = (typeof SEASONS)[number]['id'];
type CandidateGender = keyof typeof files;
export type AiCandidateSelections = Partial<Record<Season, string>>;

const styleLabels: Record<string, string> = {
  amekaji: '아메카지',
  casual: '캐주얼',
  chic: '시크',
  cityboy: '시티보이',
  classic: '클래식',
  feminine: '페미닌',
  gorpcore: '고프코어',
  lovely: '러블리',
  minimal: '미니멀',
  sporty: '스포티',
  street: '스트리트',
  vintage: '빈티지',
};

const candidates = (Object.keys(files) as CandidateGender[]).flatMap((gender) =>
  SEASONS.flatMap(({ id: season, folder, label }) =>
    files[gender][season].map((file) => {
      const id = file.replace(/\.webp$/, '');
      const style = id
        .slice(`${gender.toLowerCase()}_${folder}_`.length)
        .replace(/_attempt_\d+$/, '');
      return {
        id,
        gender,
        season,
        seasonLabel: label,
        styleLabel: styleLabels[style] ?? style,
        imageUrl: `${import.meta.env.BASE_URL}ai-candidates/${folder}/${gender.toLowerCase()}/${file}`,
      };
    }),
  ),
);

export function getAiCandidates(gender: CandidateGender, season: Season) {
  return candidates.filter(
    (candidate) => candidate.gender === gender && candidate.season === season,
  );
}

export function getSelectedAiCandidates(selections: AiCandidateSelections) {
  return SEASONS.flatMap(({ id: season }) => {
    const candidate = candidates.find(
      (item) => item.season === season && item.id === selections[season],
    );
    return candidate ? [candidate] : [];
  });
}
