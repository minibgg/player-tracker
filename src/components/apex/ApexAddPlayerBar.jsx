import React, { useState } from "react";
import { Loader2, CornerDownLeft } from "lucide-react";
import { APEX_PLATFORMS, getApexPlatform } from "../../data/apexPlatforms";

const PLACEHOLDERS = {
  PC: "ник EA-аккаунта (и для Steam) или UID",
  PS4: "PSN ID или UID",
  X1: "Gamertag или UID",
  SWITCH: "UID игрока (число)",
};

// The Apex version of the command line: platform, player name, enter
export const ApexAddPlayerBar = ({
  onAddPlayer,
  isAdding,
  hasApiKey,
  openSettings,
}) => {
  const [nameInput, setNameInput] = useState("");
  const [platformId, setPlatformId] = useState("PC");
  const [inputError, setInputError] = useState("");

  const platform = getApexPlatform(platformId);

  const handleSubmit = (e) => {
    e.preventDefault();
    setInputError("");

    const trimmed = nameInput.trim();
    if (!trimmed) {
      setInputError(`Введите ${PLACEHOLDERS[platform.id].split(" (")[0]}.`);
      return;
    }
    if (!platform.byName && !/^\d+$/.test(trimmed)) {
      setInputError(`${platform.name}: поиск только по UID, это число.`);
      return;
    }
    if (!hasApiKey) {
      setInputError("Сначала укажите API-ключ Apex Legends Status в настройках.");
      return;
    }

    onAddPlayer({ rawInput: trimmed, platformId: platform.id });
  };

  return (
    <section id="add-player" aria-label="Добавить игрока Apex">
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
          value={platformId}
          onChange={(e) => {
            setPlatformId(e.target.value);
            if (inputError) setInputError("");
          }}
          aria-label="Платформа"
          className="h-12 pl-3 pr-2 bg-transparent border-r border-line font-mono text-xs uppercase text-ink cursor-pointer rounded-none"
        >
          {APEX_PLATFORMS.map((p) => (
            <option key={p.id} value={p.id} className="bg-surface">
              {p.short}
            </option>
          ))}
        </select>

        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (inputError) setInputError("");
            }}
            id="apex-name-input"
            aria-label={`Игрок: ${platform.name}`}
            aria-invalid={Boolean(inputError)}
            placeholder={PLACEHOLDERS[platform.id]}
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

      <div className="mt-3 font-mono text-[11px] text-ink-2">
        PC: ник EA-аккаунта, даже если игра запущена через Steam · мобильная
        версия не поддерживается
      </div>
    </section>
  );
};
