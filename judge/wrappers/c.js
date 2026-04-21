// backend/judge/wrappers/c.js

export function wrapC(code, input) {
  const values = Object.values(input || {});

  // Build C variable declarations
  const declarations = values
    .map((val, i) => {
      if (Array.isArray(val)) {
        return `int arg${i}[] = {${val.join(",")}};\n    int arg${i}_size = ${val.length};`;
      }
      if (typeof val === "number") {
        return `int arg${i} = ${val};`;
      }
      return `char* arg${i} = ${JSON.stringify(val)};`;
    })
    .join("\n    ");

  const args = values
    .map((val, i) => {
      if (Array.isArray(val)) {
        return `arg${i}, arg${i}_size`;
      }
      return `arg${i}`;
    })
    .join(", ");

  return `
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

${code}

int main() {
    ${declarations}

    // Assuming the solve function returns a dynamically allocated int array
    // OR a pointer. For Two Sum, it usually returns an int* of size 2.
    int* result = solve(${args});

    if (result == NULL) {
        printf("null");
        return 0;
    }

    // For Two Sum specifically, we know size is 2. 
    // In a generic judge, we'd need more info, but let's stick to JSON array format.
    printf("[");
    // We assume size 2 for Two Sum variants for now. 
    // A real judge would handle generic return sizes.
    printf("%d,%d", result[0], result[1]);
    printf("]");

    free(result);
    return 0;
}
`;
}
