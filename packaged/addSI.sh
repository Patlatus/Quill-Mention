sfdx force:source:retrieve -m "Profile:System Admin Plus Skip ID,CustomTab:Example_Usage"
while read -r line || [[ -n "$line" ]]; do 
 [[ "$line" =~ \<visibility\>Hidden\</visibility\> ]] && line="<visibility>DefaultOn</visibility>"; 
 #[[ "$line" =~ \<default\>false\</default\> ]] && line="<default>true</default>"; 
 [[ "$line" =~ \<visible\>false\</visible\> ]] && line="<visible>true</visible>"; 
 echo "$line";  
done  < "force-app/main/default/profiles/System Admin Plus Skip ID.profile-meta.xml" > "System Admin Plus Skip ID.profile-meta.xml"
mv "System Admin Plus Skip ID.profile-meta.xml" "force-app/main/default/profiles/System Admin Plus Skip ID.profile-meta.xml"
sfdx force:source:deploy -m "Profile:System Admin Plus Skip ID,CustomTab:Example_Usage"


rm "force-app/main/default/profiles/System Admin Plus Skip ID.profile-meta.xml"