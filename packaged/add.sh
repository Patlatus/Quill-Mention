sfdx force:source:retrieve -m Profile:Admin,CustomTab:Example_Usage
while read -r line || [[ -n "$line" ]]; do 
 [[ "$line" =~ \<visibility\>Hidden\</visibility\> ]] && line="<visibility>DefaultOn</visibility>"; 
 #[[ "$line" =~ \<default\>false\</default\> ]] && line="<default>true</default>"; 
 [[ "$line" =~ \<visible\>false\</visible\> ]] && line="<visible>true</visible>"; 
 echo "$line";  
done  < "force-app/main/default/profiles/Admin.profile-meta.xml" > "Admin.profile-meta.xml"
mv Admin.profile-meta.xml force-app/main/default/profiles/Admin.profile-meta.xml
sfdx force:source:deploy -m Profile:Admin,CustomTab:Example_Usage


rm force-app/main/default/profiles/Admin.profile-meta.xml