=== ИНСТРУКЦИЯ ПО ЗВУКУ СИРЕНЫ ===

Чтобы использовать свой звук сирены:
1. Назовите ваш аудиофайл siren.mp3 (или siren.wav, siren.ogg)
2. Положите его прямо в папку public/ (например: e:\Projects\player-tracker\public\siren.mp3)
   или в эту папку public/sounds/ (e:\Projects\player-tracker\public\sounds\siren.mp3)

Приоритет:
- Если файл siren.mp3 добавлен пользователем, приложение всегда воспроизводит его.
- Если файла нет, будет воспроизводиться стандартный siren.wav или встроенная громкая сирена через Web Audio API.
