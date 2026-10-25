# Keep line information for useful Play Console crash reports with mapping.txt.
-keepattributes SourceFile,LineNumberTable

# Android components and AndroidX WebKit's reflection-based bridges are covered
# by the optimized Android defaults and each dependency's consumer rules.
# Do not keep the whole app/library: doing so would defeat R8 optimization.
