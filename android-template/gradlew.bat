@echo off
setlocal
set DIR=%~dp0
set JAR=%DIR%gradle\wrapper\gradle-wrapper.jar
if not exist "%JAR%" (
  echo gradle-wrapper.jar missing. Run: cd android-template ^&^& gradle wrapper --gradle-version 8.5
  exit /b 1
)
java -classpath "%JAR%" org.gradle.wrapper.GradleWrapperMain %*