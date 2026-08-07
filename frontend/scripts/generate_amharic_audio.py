from gtts import gTTS
from pathlib import Path

OUTPUT_DIR = Path(__file__).resolve().parent.parent / 'public' / 'audio' / 'am'
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ONES = {
    0: 'ሜዳ',
    1: 'አንድ',
    2: 'ሁለት',
    3: 'ሶስት',
    4: 'አራት',
    5: 'አምስት',
    6: 'ስድስት',
    7: 'ሰባት',
    8: 'ስምንት',
    9: 'ዘጠኝ',
}

TENS = {
    0: '',
    1: 'አስር',
    2: 'ሃያ',
    3: 'ሰላሳ',
    4: 'አርባ',
    5: 'ሃምሳ',
    6: 'ስልሳ',
    7: 'ሰባ',
}

EXACT = {
    10: 'አስር',
    11: 'አስራ አንድ',
    12: 'አስራ ሁለት',
    13: 'አስራ ሶስት',
    14: 'አስራ አራት',
    15: 'አስራ አምስት',
    16: 'አስራ ስድስት',
    17: 'አስራ ሰባት',
    18: 'አስራ ስምንት',
    19: 'አስራ ዘጠኝ',
}


def amharic_number(n: int) -> str:
    if n in EXACT:
        return EXACT[n]
    if n < 10:
        return ONES[n]
    tens = n // 10
    ones = n % 10
    if ones == 0:
        return TENS[tens]
    return f"{TENS[tens]} {ONES[ones]}"

for number in range(1, 76):
    text = f'ቁጥር {amharic_number(number)}'
    filename = OUTPUT_DIR / f'number-{number:02d}.mp3'
    print(f'Generating {filename} -> {text}')
    tts = gTTS(text, lang='am')
    tts.save(str(filename))

print('Done generating Amharic number audio files.')
