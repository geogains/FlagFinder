#!/bin/bash
# rename-flags.sh
# Renames flag files from lowercase to ISO code format

cd flags || exit 1

echo "🏁 Renaming flag files to ISO codes..."
echo "======================================"

# Rename lowercase named flags to uppercase ISO codes
mv benin.png BJ.png 2>/dev/null && echo "✅ benin.png → BJ.png"
mv bhutan.png BT.png 2>/dev/null && echo "✅ bhutan.png → BT.png"
mv burundi.png BI.png 2>/dev/null && echo "✅ burundi.png → BI.png"
mv cape-verde.png CV.png 2>/dev/null && echo "✅ cape-verde.png → CV.png"
mv comoros.png KM.png 2>/dev/null && echo "✅ comoros.png → KM.png"
mv dominica.png DM.png 2>/dev/null && echo "✅ dominica.png → DM.png"
mv eswatini.png SZ.png 2>/dev/null && echo "✅ eswatini.png → SZ.png"
mv grenada.png GD.png 2>/dev/null && echo "✅ grenada.png → GD.png"
mv lesotho.png LS.png 2>/dev/null && echo "✅ lesotho.png → LS.png"
mv liberia.png LR.png 2>/dev/null && echo "✅ liberia.png → LR.png"
mv liechtenstein.png LI.png 2>/dev/null && echo "✅ liechtenstein.png → LI.png"
mv marshall-islands.png MH.png 2>/dev/null && echo "✅ marshall-islands.png → MH.png"
mv nauru.png NR.png 2>/dev/null && echo "✅ nauru.png → NR.png"
mv saint-lucia.png LC.png 2>/dev/null && echo "✅ saint-lucia.png → LC.png"
mv saint-vincent-and-the-grenadines.png VC.png 2>/dev/null && echo "✅ saint-vincent-and-the-grenadines.png → VC.png"
mv samoa.png WS.png 2>/dev/null && echo "✅ samoa.png → WS.png"
mv sao-tome-and-principe.png ST.png 2>/dev/null && echo "✅ sao-tome-and-principe.png → ST.png"
mv seychelles.png SC.png 2>/dev/null && echo "✅ seychelles.png → SC.png"
mv sierra-leone.png SL.png 2>/dev/null && echo "✅ sierra-leone.png → SL.png"
mv solomon-islands.png SB.png 2>/dev/null && echo "✅ solomon-islands.png → SB.png"
mv togo.png TG.png 2>/dev/null && echo "✅ togo.png → TG.png"
mv tonga.png TO.png 2>/dev/null && echo "✅ tonga.png → TO.png"
mv tuvalu.png TV.png 2>/dev/null && echo "✅ tuvalu.png → TV.png"
mv vatican-city.png VA.png 2>/dev/null && echo "✅ vatican-city.png → VA.png"
mv east-timor.png TL.png 2>/dev/null && echo "✅ east-timor.png → TL.png"

echo ""
echo "======================================"
echo "✅ Renaming complete!"
