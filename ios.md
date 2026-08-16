PA

npx eas-cli build --platform ios --profile production

npx eas-cli submit --platform ios --profile production


rm -rf ios 
npx expo prebuild --platform ios --clean
npx expo run:ios --device --configuration Release
