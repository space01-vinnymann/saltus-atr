import { RadioGroup, Radio } from '@headlessui/react'
import { useState } from 'react'
import { riskRatings } from '../utils/riskRatings'

const levels = Object.entries(riskRatings).map(([key, value]) => ({
  rating: Number(key),
  ...value,
}))

export function RiskLevelSelector() {
  const [selected, setSelected] = useState<number>(1)

  const selectedLevel = riskRatings[selected]

  return (
    <div className="rounded-xl bg-muted p-5">
      <p className="mb-4 font-body text-[13px] font-medium text-muted-fg">
        Click each level to learn more
      </p>

      <RadioGroup value={selected} onChange={setSelected} className="mb-5 grid grid-cols-6 gap-2 sm:flex">
        {levels.map((level) => (
          <Radio
            key={level.rating}
            value={level.rating}
            className={`group flex cursor-pointer flex-col items-center gap-1 rounded-input border border-border-clr bg-panel py-3 px-2 text-center transition-colors data-checked:border-2 data-checked:border-foreground data-checked:bg-muted hover:border-muted-fg sm:flex-1 ${level.rating <= 3 ? 'col-span-2' : 'col-span-3'}`}
          >
            <span className="font-heading text-lg font-bold text-foreground">
              {level.rating}
            </span>
            <span className="font-body text-[11px] text-muted-fg group-data-checked:font-medium group-data-checked:text-foreground">
              {level.shortLabel}
            </span>
          </Radio>
        ))}
      </RadioGroup>

      {selectedLevel && (
        <div>
          <p className="mb-1 font-heading text-base font-bold text-foreground">
            {selectedLevel.label}
          </p>
          <p className="font-body text-sm leading-relaxed text-foreground">
            {selectedLevel.description}
          </p>
        </div>
      )}
    </div>
  )
}
