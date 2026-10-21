import React from "react";
import { Check, ExternalLink } from "lucide-react";

const Step = ({ index, done, title, children }) => (
  <li className="flex gap-4 py-4 border-b border-line last:border-b-0">
    <span
      className={`w-6 shrink-0 pt-0.5 font-mono text-xs ${
        done ? "text-success" : "text-accent-ink"
      }`}
    >
      {done ? <Check className="w-3.5 h-3.5" aria-label="готово" /> : index}
    </span>
    <div className="min-w-0 flex-1">
      <div className={`text-sm ${done ? "text-ink-2" : "text-ink"}`}>
        {title}
      </div>
      {children && (
        <div className="mt-1.5 text-xs text-ink-2 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  </li>
);

const linkClass =
  "text-accent-ink underline decoration-line-strong underline-offset-4 hover:decoration-accent";

// First run: the steps to the first "player started a game" alert
export const FirstRunGuide = ({ hasApiKey, openSettings, focusAddInput }) => (
  <div className="border border-dashed border-line-strong px-5 sm:px-8 py-7">
    <div className="label">первый запуск</div>
    <h3 className="font-display text-2xl text-ink mt-1">
      Три шага до первого уведомления
    </h3>
    <ol className="mt-3">
      <Step
        index="01"
        done={hasApiKey}
        title={hasApiKey ? "API-ключ Riot указан" : "Получите бесплатный API-ключ Riot"}
      >
        {!hasApiKey && (
          <>
            Войдите на{" "}
            <a
              href="https://developer.riotgames.com/"
              target="_blank"
              rel="noreferrer"
              className={`${linkClass} inline-flex items-center gap-1`}
            >
              developer.riotgames.com
              <ExternalLink className="w-3 h-3" />
            </a>
            , скопируйте Development API Key и{" "}
            <button type="button" onClick={openSettings} className={linkClass}>
              вставьте его в настройках
            </button>
            . Ключ действует 24 часа.
          </>
        )}
      </Step>
      <Step index="02" title="Добавьте игрока">
        <button type="button" onClick={focusAddInput} className={linkClass}>
          Введите Riot ID
        </button>{" "}
        в строке выше: имя и тег через #, например Faker#KR1, и выберите
        регион.
      </Step>
      <Step index="03" title="Оставьте вкладку открытой">
        Трекер сам проверяет игроков и сообщит звуком и уведомлением, когда
        кто-то зайдёт в матч. Его можно установить как приложение.
      </Step>
    </ol>
  </div>
);

// First run of the Apex tab: same three steps, its own key
export const ApexFirstRunGuide = ({ hasApiKey, openSettings, focusAddInput }) => (
  <div className="border border-dashed border-line-strong px-5 sm:px-8 py-7">
    <div className="label">первый запуск · apex legends</div>
    <h3 className="font-display text-2xl text-ink mt-1">
      Три шага до первого уведомления
    </h3>
    <ol className="mt-3">
      <Step
        index="01"
        done={hasApiKey}
        title={
          hasApiKey
            ? "API-ключ Apex Legends Status указан"
            : "Получите бесплатный API-ключ Apex Legends Status"
        }
      >
        {!hasApiKey && (
          <>
            У EA нет открытого API, поэтому данные берутся у{" "}
            <a
              href="https://portal.apexlegendsapi.com/"
              target="_blank"
              rel="noreferrer"
              className={`${linkClass} inline-flex items-center gap-1`}
            >
              portal.apexlegendsapi.com
              <ExternalLink className="w-3 h-3" />
            </a>
            : войдите, нажмите «Create an API key» и{" "}
            <button type="button" onClick={openSettings} className={linkClass}>
              вставьте ключ в настройках
            </button>
            .
          </>
        )}
      </Step>
      <Step index="02" title="Добавьте игрока">
        <button type="button" onClick={focusAddInput} className={linkClass}>
          Выберите платформу и введите ник
        </button>
        : для PC это ник EA-аккаунта (и для Steam), для консолей PSN ID или
        Gamertag. Игроков Switch можно найти только по UID.
      </Step>
      <Step index="03" title="Оставьте вкладку открытой">
        Трекер сообщит, когда игрок зайдёт в матч, а после матча покажет
        изменение RP и, если трекеры стоят на баннере, убийства и урон.
        Вкладка League при этом тоже продолжает опрос.
      </Step>
    </ol>
  </div>
);

// The list has players, but the filter or search hides all of them
export const NoMatchesState = ({ onReset }) => (
  <div className="border border-dashed border-line-strong px-6 py-12 text-center">
    <div className="font-display text-xl text-ink">
      Нет игроков по этому фильтру
    </div>
    <p className="text-sm text-ink-2 mt-2">
      Измените фильтр или{" "}
      <button type="button" onClick={onReset} className={linkClass}>
        покажите всех
      </button>
      .
    </p>
  </div>
);
