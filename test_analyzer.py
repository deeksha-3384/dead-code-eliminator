from analyzer import analyze_code

with open("test_sample.py", "r") as f:
    source = f.read()

results = analyze_code(source)

for item in results:
    print(item)