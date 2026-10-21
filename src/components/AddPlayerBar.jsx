import React, { useState } from "react";
import { Loader2, CornerDownLeft } from "lucide-react";
import { REGIONS, getRegionById } from "../data/regions";

const EXAMPLES = [
  { id: "Agurin#EUW", region: "euw1" },
  { id: "Hide on bush#KR1", region: "kr" },
  { id: "G2 Caps#EUW", region: "euw1" },
  { id: "Doublelift#NA1", region: "na1" },
];

// A command-line style input: region, Riot ID, enter
export const AddPlayerBar = ({
  onAddPlayer,
  isAdding,
  hasApiKey,
  openSettings,
}) => {
  const [riotIdInput, setRiotIdInput] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("euw1");
  const [inputError, setInputError] = useState("");

  const currentRegion = getRegionById(selectedRegionId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setInputError("");

    const trimmed = riotIdInput.trim();
    if (!trimmed) {
      setInputError("Введите Riot ID, например Faker#KR1");
      return;
    }

    if (!hasApiKey) {
      setInputError("Сначала укажите API-ключ Riot в настройках.");
      return;
    }

    onAddPlayer({
      rawInput: trimmed,
      regionId: selectedRegionId,
    });
  };

  return (
    <section id="add-player" aria-label="Добавить игрока">
      <div className="label mb-2">Добавить игрока</div>

      <form
        onSubmit={handleSubmit}
        className={`flex items-stretch border bg-surface transition-colors focus-within:border-accent ${
          inputError ? "border-danger" : "border-line-strong"
        }`}
      >
        <span
          className="hidden sm:flex items-center pl-4 font-mono text-accent-ink select-none"
          aria-hidden="true"
        >
          ›
        </span>

        <select
          value={selectedRegionId}
          onChange={(e) => setSelectedRegionId(e.target.value)}
          aria-label="Регион"
          className="h-12 pl-3 pr-2 bg-transparent border-r border-line font-mono text-xs uppercase text-ink cursor-pointer rounded-none"
        >
          {REGIONS.map((region) => (
            <option key={region.id} value={region.id} className="bg-surface">
              {region.short}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={riotIdInput}
            onChange={(e) => {
              setRiotIdInput(e.target.value);
              if (inputError) setInputError("");
            }}
            id="riot-id-input"
            aria-label="Riot ID"
            aria-invalid={Boolean(inputError)}
            placeholder={`Имя#ТЕГ  (по умолчанию #${currentRegion.defaultTag})`}
            className="w-full h-12 px-3 bg-transparent font-mono text-sm text-ink placeholder-ink-2 rounded-none border-0"
          />
        </div>

        <button
          type="submit"
          disabled={isAdding}
          className="btn-primary px-4 sm:px-5 flex items-center gap-2 font-mono text-xs shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAdding ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>проверка…</span>
            </>
          ) : (
            <>
              <span>добавить</span>
              <CornerDownLeft className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {inputError && (
        <div role="alert" className="mt-2 font-mono text-xs text-danger">
          {inputError}{" "}
          {!hasApiKey && (
            <button
              type="button"
              onClick={openSettings}
              className="underline text-accent-ink hover:text-accent-hover"
            >
              открыть настройки
            </button>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-ink-2">
        <span>примеры:</span>
        {EXAMPLES.map((ex) => (
          <button
            key={ex.id}
            type="button"
            onClick={() => {
              setSelectedRegionId(ex.region);
              setRiotIdInput(ex.id);
            }}
            className="underline decoration-line-strong underline-offset-4 hover:text-accent-ink hover:decoration-accent transition-colors"
          >
            {ex.id}
          </button>
        ))}
      </div>
    </section>
  );
};
