import random


def keywords(input_file, output_file):
    with open(input_file, "r", encoding="utf-8") as f:
        lines = f.readlines()

    cleaned = [line for line in lines if line.strip()]  # keep only non-empty
    random.shuffle(cleaned)

    with open(output_file, "w", encoding="utf-8") as f:
        f.writelines(cleaned)


keywords("trends.txt", "keywords.txt")
