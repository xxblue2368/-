import { USE_MOCK_API } from '../../api/client';
import type { BodyTypeOption } from '../../api/onboarding';
import { BODY_TYPES, BODY_TYPE_GUIDANCE, type BodyGender } from '../../data/bodyTypes';

const localShapeIds: Record<string, string> = {
  men_trapezoid_athletic: 'male_trapezoid',
  men_triangle: 'male_triangle',
  men_inverted_triangle: 'male_inverted_triangle',
  men_rectangle: 'male_rectangle',
  men_oval_apple: 'male_oval',
  women_hourglass: 'female_hourglass',
  women_triangle_pear: 'female_triangle',
  women_inverted_triangle: 'female_inverted_triangle',
  women_rectangle: 'female_rectangle',
  women_round_apple: 'female_round',
};

type Props = {
  gender: BodyGender | '';
  value: string | null;
  onChange: (id: string) => void;
  remoteOptions?: BodyTypeOption[];
  disabled?: boolean;
};

export function BodyTypePicker({ gender, value, onChange, remoteOptions = [], disabled }: Props) {
  if (!gender) {
    return <div className="body-type-empty">먼저 상단에서 성별을 선택해 주세요.</div>;
  }

  const options = USE_MOCK_API ? BODY_TYPES[gender] : remoteOptions;
  const selected = options.find((option) => option.id === value);

  return (
    <div className="body-type-picker">
      <p className="body-type-guidance">{BODY_TYPE_GUIDANCE[gender]}</p>
      <div className="body-image-grid">
        {options.map((option) => {
          const fallback = BODY_TYPES[gender].find(({ id }) => id === localShapeIds[option.id]);
          return (
            <button
              key={option.id}
              type="button"
              className={value === option.id ? 'selected' : ''}
              aria-label={option.label}
              aria-pressed={value === option.id}
              disabled={disabled}
              onClick={() => onChange(option.id)}
            >
              <img
                src={option.imageUrl}
                alt=""
                onError={({ currentTarget }) => {
                  if (fallback && currentTarget.getAttribute('src') !== fallback.imageUrl) {
                    currentTarget.src = fallback.imageUrl;
                  }
                }}
              />
              {value === option.id && <b aria-hidden="true">✓</b>}
            </button>
          );
        })}
      </div>
      {selected?.description && (
        <div className="body-type-description" role="status">
          <p>{selected.description}</p>
        </div>
      )}
    </div>
  );
}
