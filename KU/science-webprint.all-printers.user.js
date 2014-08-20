// ==UserScript==
// @name       KU Science Webprint Unlocker
// @namespace  http://mathemaniac.org
// @version    1.0.3
// @description  Tilføjer alllle printere til SCIENCE webprint. (Tak til Brandt for dumpet.)
// @match      https://webprint.science.ku.dk/?*
// @match      https://webprint.science.ku.dk/index.cfm*
// @match      https://webprint.science.ku.dk/driverprint.cfm*
// @copyright  2014, Sebastian Paaske Tørholm
// @require    https://ajax.googleapis.com/ajax/libs/jquery/1.10.1/jquery.min.js
// ==/UserScript==

$('#PID').html('<select name="PID" id="PID">    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Biocenter</option>    <option value="Fqs=">&nbsp;&nbsp;&nbsp;BIOC-1-0-14A</option>    <option value="Fqna">&nbsp;&nbsp;&nbsp;BIOC-1-0-18</option>    <option value="Fqnf">&nbsp;&nbsp;&nbsp;BIOC-1-0-18-B</option>    <option value="Fafc">&nbsp;&nbsp;&nbsp;BIOC-1-1-07B</option>    <option value="FafS">&nbsp;&nbsp;&nbsp;BIOC-1-1-07B-B</option>    <option value="Fqg=">&nbsp;&nbsp;&nbsp;BIOC-1-1-16</option>    <option value="Fqk=">&nbsp;&nbsp;&nbsp;BIOC-1-1-30</option>    <option value="Fafd">&nbsp;&nbsp;&nbsp;BIOC-1-1-30-C</option>    <option value="FafT">&nbsp;&nbsp;&nbsp;BIOC-1-2-07B</option>    <option value="Fq7f">&nbsp;&nbsp;&nbsp;BIOC-4-0-27A</option>    <option value="Fqje">&nbsp;&nbsp;&nbsp;BIOC-4-0-27A-B</option>    <option value="Fqbf">&nbsp;&nbsp;&nbsp;BIOC-4-1-18A</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">DIKU</option>    <option value="Faw=">&nbsp;&nbsp;&nbsp;HCO-01-0-S01</option>    <option value="Fao=">&nbsp;&nbsp;&nbsp;HCO-01-0-S11</option>    <option value="Fas=">&nbsp;&nbsp;&nbsp;HCO-01-0-S11-B</option>    <option value="Fqnc">&nbsp;&nbsp;&nbsp;HCO-04-0-03</option>    <option value="Fqnd">&nbsp;&nbsp;&nbsp;HCO-04-0-03-B</option>    <option value="Fqne">&nbsp;&nbsp;&nbsp;HCO-04-0-03-C</option>    <option value="FaY=">&nbsp;&nbsp;&nbsp;HCO-07-0-S05B</option>    <option value="FqbZ">&nbsp;&nbsp;&nbsp;KUA-24-5-35</option>    <option value="Fqba">&nbsp;&nbsp;&nbsp;KUA-24-5-35-B</option>    <option value="Fqbb">&nbsp;&nbsp;&nbsp;KUA-24-5-35-C</option>    <option value="FqbY">&nbsp;&nbsp;&nbsp;KUA-24-5-35-D</option>    <option value="FqnS">&nbsp;&nbsp;&nbsp;UP1-2-0-02</option>    <option value="FqnT">&nbsp;&nbsp;&nbsp;UP1-2-0-02-B</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">FollowMe (Østervoldgade 10)</option>    <option value="Fq7b">&nbsp;&nbsp;&nbsp;FollowMe-A4-staff</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">FollowMe stud (Østervoldgade 10) </option>    <option value="Fq7a">&nbsp;&nbsp;&nbsp;FollowMe-A4-stud</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Frederiksberg Campus område 1 | Bülowsvej 17 mm</option>    <option value="FqY=">&nbsp;&nbsp;&nbsp;BV17-01-0-A06</option>    <option value="Fqc=">&nbsp;&nbsp;&nbsp;BV17-01-0-A11</option>    <option value="F64=">&nbsp;&nbsp;&nbsp;BV17-01-0-A16</option>    <option value="F68=">&nbsp;&nbsp;&nbsp;BV17-01-0-A22</option>    <option value="F6w=">&nbsp;&nbsp;&nbsp;BV17-01-0-A26</option>    <option value="F60=">&nbsp;&nbsp;&nbsp;BV17-01-0-A31</option>    <option value="F6o=">&nbsp;&nbsp;&nbsp;BV17-01-0-A34</option>    <option value="F6s=">&nbsp;&nbsp;&nbsp;BV17-01-0-A41</option>    <option value="F6g=">&nbsp;&nbsp;&nbsp;BV17-01-0-A41-B</option>    <option value="F6k=">&nbsp;&nbsp;&nbsp;BV17-01-0-A43</option>    <option value="F6Y=">&nbsp;&nbsp;&nbsp;BV17-01-0-A45</option>    <option value="F6c=">&nbsp;&nbsp;&nbsp;BV17-01-0-A47</option>    <option value="EK4=">&nbsp;&nbsp;&nbsp;BV17-01-0-A49</option>    <option value="EK8=">&nbsp;&nbsp;&nbsp;BV17-01-0-A49-B</option>    <option value="EKw=">&nbsp;&nbsp;&nbsp;BV17-01-0-A51</option>    <option value="EK0=">&nbsp;&nbsp;&nbsp;BV17-01-0-E14</option>    <option value="Fa0=">&nbsp;&nbsp;&nbsp;BV17-01-0-F16</option>    <option value="Fac=">&nbsp;&nbsp;&nbsp;BV17-01-0-F39</option>    <option value="EKo=">&nbsp;&nbsp;&nbsp;BV17-01-0-N39</option>    <option value="EKs=">&nbsp;&nbsp;&nbsp;BV17-01-0-T39</option>    <option value="EKg=">&nbsp;&nbsp;&nbsp;BV17-01-1-A123</option>    <option value="EKk=">&nbsp;&nbsp;&nbsp;BV17-01-1-A131</option>    <option value="EKY=">&nbsp;&nbsp;&nbsp;BV17-01-1-A141</option>    <option value="EKc=">&nbsp;&nbsp;&nbsp;BV17-01-1-C151</option>    <option value="FqvZ">&nbsp;&nbsp;&nbsp;BV17-01-1-D101</option>    <option value="Ea4=">&nbsp;&nbsp;&nbsp;BV17-01-1-D116</option>    <option value="Ea8=">&nbsp;&nbsp;&nbsp;BV17-01-1-D116-B</option>    <option value="Fq4=">&nbsp;&nbsp;&nbsp;BV17-01-1-F141</option>    <option value="Eaw=">&nbsp;&nbsp;&nbsp;BV17-01-1-F141-B</option>    <option value="Ea0=">&nbsp;&nbsp;&nbsp;BV17-01-1-N116</option>    <option value="Eao=">&nbsp;&nbsp;&nbsp;BV17-01-1-O114</option>    <option value="Eas=">&nbsp;&nbsp;&nbsp;BV17-02-0-A1</option>    <option value="Eag=">&nbsp;&nbsp;&nbsp;BV17-02-0-E15</option>    <option value="Eak=">&nbsp;&nbsp;&nbsp;BV17-02-0-E15-B</option>    <option value="EaY=">&nbsp;&nbsp;&nbsp;BV17-02-0-E15-C</option>    <option value="FabT">&nbsp;&nbsp;&nbsp;BV17-02-0-E15-D</option>    <option value="FabS">&nbsp;&nbsp;&nbsp;BV17-02-0-E15-E</option>    <option value="Fqra">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-D</option>    <option value="Fqre">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-E</option>    <option value="Fqrf">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-F</option>    <option value="FqrY">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-G</option>    <option value="Eac=">&nbsp;&nbsp;&nbsp;BV17-06-01-B061</option>    <option value="Eq4=">&nbsp;&nbsp;&nbsp;BV17-06-01-B061-B</option>    <option value="Eq8=">&nbsp;&nbsp;&nbsp;BV17-06-01-B061-C</option>    <option value="Eqw=">&nbsp;&nbsp;&nbsp;BV17-06-01-B60</option>    <option value="Eq0=">&nbsp;&nbsp;&nbsp;BV17-06-01-B60-B</option>    <option value="Eqo=">&nbsp;&nbsp;&nbsp;BV17-06-01-E061</option>    <option value="Eqs=">&nbsp;&nbsp;&nbsp;BV17-06-1-A101</option>    <option value="Eqg=">&nbsp;&nbsp;&nbsp;BV17-06-1-D160</option>    <option value="Eqk=">&nbsp;&nbsp;&nbsp;BV17-06-1-I166</option>    <option value="Fqrc">&nbsp;&nbsp;&nbsp;BV17-06-1-I166-C</option>    <option value="Fqva">&nbsp;&nbsp;&nbsp;BV17-19-0-A3</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Frederiksberg Campus område 2 | Thorvaldsvej 40 mm</option>    <option value="Fqrb">&nbsp;&nbsp;&nbsp;FC2-51-0-A11</option>    <option value="Fqzf">&nbsp;&nbsp;&nbsp;FC2-70-1-B105</option>    <option value="FqzZ">&nbsp;&nbsp;&nbsp;FC2-70-1-C117</option>    <option value="Fq/b">&nbsp;&nbsp;&nbsp;FC2-70-1-E117</option>    <option value="Fq/d">&nbsp;&nbsp;&nbsp;FC2-70-2-E217</option>    <option value="Fq/Y">&nbsp;&nbsp;&nbsp;FC2-70-2-E217-B</option>    <option value="Fqze">&nbsp;&nbsp;&nbsp;FC2-70-2-E217-C</option>    <option value="Fq3Z">&nbsp;&nbsp;&nbsp;FC2-70-3-E317</option>    <option value="Fq3T">&nbsp;&nbsp;&nbsp;FC2-71-1-R118</option>    <option value="Fqzb">&nbsp;&nbsp;&nbsp;FC2-71-1-T131</option>    <option value="Fq3d">&nbsp;&nbsp;&nbsp;FC2-71-2-R235i</option>    <option value="Fq/S">&nbsp;&nbsp;&nbsp;FC2-71-2-T229</option>    <option value="Fq3Y">&nbsp;&nbsp;&nbsp;FC2-71-3-R329</option>    <option value="FqrS">&nbsp;&nbsp;&nbsp;FC2-71-5-A</option>    <option value="Fqbc">&nbsp;&nbsp;&nbsp;FC2-71-5-R535E</option>    <option value="FqzY">&nbsp;&nbsp;&nbsp;FC2-72-1-R152E</option>    <option value="Fq3f">&nbsp;&nbsp;&nbsp;FC2-72-2-R252E</option>    <option value="Fqrd">&nbsp;&nbsp;&nbsp;FC2-72-2-R252E-B</option>    <option value="Fq3S">&nbsp;&nbsp;&nbsp;FC2-72-2-R252E-B</option>    <option value="Fqza">&nbsp;&nbsp;&nbsp;FC2-72-2-T249</option>    <option value="Fq/c">&nbsp;&nbsp;&nbsp;FC2-72-3-T348</option>    <option value="Fqve">&nbsp;&nbsp;&nbsp;FC2-72-4-A</option>    <option value="Fqvd">&nbsp;&nbsp;&nbsp;FC2-72-4-B</option>    <option value="Fq/a">&nbsp;&nbsp;&nbsp;FC2-72-6-R635i</option>    <option value="Fq/T">&nbsp;&nbsp;&nbsp;FC2-73-3-R369E</option>    <option value="FqvY">&nbsp;&nbsp;&nbsp;FC2-73-4-B</option>    <option value="Fqvc">&nbsp;&nbsp;&nbsp;FC2-73-4-C</option>    <option value="FqrT">&nbsp;&nbsp;&nbsp;FC2-73-6-T665</option>    <option value="FqjZ">&nbsp;&nbsp;&nbsp;FC2-74-3-A</option>    <option value="Fqja">&nbsp;&nbsp;&nbsp;FC2-74-3-B</option>    <option value="FqvT">&nbsp;&nbsp;&nbsp;FC2-74-3-C</option>    <option value="Fqjb">&nbsp;&nbsp;&nbsp;FC2-74-4-A</option>    <option value="Fqvf">&nbsp;&nbsp;&nbsp;FC2-74-5-A</option>    <option value="FqvS">&nbsp;&nbsp;&nbsp;FC2-85-0-A</option>    <option value="FqjY">&nbsp;&nbsp;&nbsp;FC2-85-4-A</option>    <option value="Fqjf">&nbsp;&nbsp;&nbsp;FC2-85-5-A</option>    <option value="FazZ">&nbsp;&nbsp;&nbsp;THV40-51-0-A18</option>    <option value="FazY">&nbsp;&nbsp;&nbsp;THV40-51-0-A61</option>    <option value="Fazf">&nbsp;&nbsp;&nbsp;THV40-63-0-C55</option>    <option value="Faze">&nbsp;&nbsp;&nbsp;THV40-64-0-H72</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Frederiksberg Campus område 3 | Rolighedsvej 23 mm</option>    <option value="Fq/f">&nbsp;&nbsp;&nbsp;FC3-22-0-G04</option>    <option value="Fq/Z">&nbsp;&nbsp;&nbsp;FC3-22-1-D106</option>    <option value="Fq/e">&nbsp;&nbsp;&nbsp;FC3-23-0-D13</option>    <option value="Fq3a">&nbsp;&nbsp;&nbsp;FC3-23-0-R03</option>    <option value="Fqjc">&nbsp;&nbsp;&nbsp;FC3-61-1-201A</option>    <option value="Fq7c">&nbsp;&nbsp;&nbsp;RV23-21-1-E207</option>    <option value="Fq7S">&nbsp;&nbsp;&nbsp;RV23-21-1-E207-B</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Gothersgade 130</option>    <option value="EqY=">&nbsp;&nbsp;&nbsp;GG130-01-01-002</option>    <option value="Eqc=">&nbsp;&nbsp;&nbsp;GG130-01-1-202</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">HCØ</option>    <option value="Faw=">&nbsp;&nbsp;&nbsp;HCO-01-0-S01</option>    <option value="Fao=">&nbsp;&nbsp;&nbsp;HCO-01-0-S11</option>    <option value="Fas=">&nbsp;&nbsp;&nbsp;HCO-01-0-S11-B</option>    <option value="E64=">&nbsp;&nbsp;&nbsp;HCO-01-1-G02</option>    <option value="E68=">&nbsp;&nbsp;&nbsp;HCO-01-1-G02-B</option>    <option value="E6w=">&nbsp;&nbsp;&nbsp;HCO-02-1-C103</option>    <option value="E6o=">&nbsp;&nbsp;&nbsp;HCO-07-0-S05B</option>    <option value="FaY=">&nbsp;&nbsp;&nbsp;HCO-07-0-S05B</option>    <option value="E6s=">&nbsp;&nbsp;&nbsp;HCO-07-1-111</option>    <option value="E6g=">&nbsp;&nbsp;&nbsp;HCO-07-1-112</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Marinbiologisk Lab</option>    <option value="E6k=">&nbsp;&nbsp;&nbsp;MBL-01-1-G1</option>    <option value="E6c=">&nbsp;&nbsp;&nbsp;MBL-02-1-G1</option>    <option value="HK8=">&nbsp;&nbsp;&nbsp;MBL-03-0-1</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Math</option>    <option value="Fafa">&nbsp;&nbsp;&nbsp;HCO-04-1-102</option>    <option value="FafZ">&nbsp;&nbsp;&nbsp;HCO-04-1-G03</option>    <option value="FafY">&nbsp;&nbsp;&nbsp;HCO-04-2-215</option>    <option value="Faff">&nbsp;&nbsp;&nbsp;HCO-04-3-307A</option>    <option value="Fafe">&nbsp;&nbsp;&nbsp;HCO-04-4-413</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Nørre Alle 51</option>    <option value="HKw=">&nbsp;&nbsp;&nbsp;NA-01-0-N03B</option>    <option value="HK0=">&nbsp;&nbsp;&nbsp;NA-01-0-S06</option>    <option value="HKo=">&nbsp;&nbsp;&nbsp;NA-01-0-S08</option>    <option value="Fafb">&nbsp;&nbsp;&nbsp;NA-01-0-S23A</option>    <option value="HKg=">&nbsp;&nbsp;&nbsp;NA-01-1-N05</option>    <option value="HKk=">&nbsp;&nbsp;&nbsp;NA-01-2-00</option>    <option value="HKY=">&nbsp;&nbsp;&nbsp;NA-01-2-00A</option>    <option value="HKc=">&nbsp;&nbsp;&nbsp;NA-01-2-N04</option>    <option value="Ha4=">&nbsp;&nbsp;&nbsp;NA-01-2-S06</option>    <option value="Fak=">&nbsp;&nbsp;&nbsp;NA-01-2-S06-B</option>    <option value="Ha8=">&nbsp;&nbsp;&nbsp;NA-03-0-03A</option>    <option value="Ha0=">&nbsp;&nbsp;&nbsp;NA-03-0-18A-B</option>    <option value="Has=">&nbsp;&nbsp;&nbsp;NA-03-1-16A</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Rolighedsvej 23</option>    <option value="Fq7c">&nbsp;&nbsp;&nbsp;RV23-21-1-E207</option>    <option value="Fq7S">&nbsp;&nbsp;&nbsp;RV23-21-1-E207-B</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Studenterprint</option>    <option value="Fqje">&nbsp;&nbsp;&nbsp;BIOC-4-0-27A-B</option>    <option value="Fqbe">&nbsp;&nbsp;&nbsp;BV17-01-1-T114</option>    <option value="Fqra">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-D</option>    <option value="Fqre">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-E</option>    <option value="Fqrf">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-F</option>    <option value="FqrY">&nbsp;&nbsp;&nbsp;BV17-06-0-B60-G</option>    <option value="FqrZ">&nbsp;&nbsp;&nbsp;BV17-06-1-I166-B</option>    <option value="Fqrc">&nbsp;&nbsp;&nbsp;BV17-06-1-I166-C</option>    <option value="FqbT">&nbsp;&nbsp;&nbsp;FC2-70-0-D29</option>    <option value="FqbS">&nbsp;&nbsp;&nbsp;FC2-70-0A-DB29</option>    <option value="Fqfb">&nbsp;&nbsp;&nbsp;FC3-21-S215</option>    <option value="Fq7a">&nbsp;&nbsp;&nbsp;FollowMe-A4-stud</option>    <option value="Fq7Y">&nbsp;&nbsp;&nbsp;FollowMe-OV10-Ricoh-stud</option>    <option value="E6w=">&nbsp;&nbsp;&nbsp;HCO-02-1-C103</option>    <option value="E6s=">&nbsp;&nbsp;&nbsp;HCO-07-1-111</option>    <option value="E6g=">&nbsp;&nbsp;&nbsp;HCO-07-1-112</option>    <option value="HKk=">&nbsp;&nbsp;&nbsp;NA-01-2-00</option>    <option value="HKc=">&nbsp;&nbsp;&nbsp;NA-01-2-N04</option>    <option value="Fqbd">&nbsp;&nbsp;&nbsp;TAAS-18</option>    <option value="Fqfa">&nbsp;&nbsp;&nbsp;UP13-1-01-002C</option>    <option value="Favb">&nbsp;&nbsp;&nbsp;UP13-1-1-180</option>    <option value="Fava">&nbsp;&nbsp;&nbsp;UP13-1-1-180-B</option>    <option value="FqnZ">&nbsp;&nbsp;&nbsp;UP15-3-3-439</option>    <option value="FqnY">&nbsp;&nbsp;&nbsp;UP15-3-4-529</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Sølvtorvskomplekset</option>    <option value="Fa/c">&nbsp;&nbsp;&nbsp;SG-01-0-018</option>    <option value="Fa/T">&nbsp;&nbsp;&nbsp;SG-01-1-17A</option>    <option value="Fa/S">&nbsp;&nbsp;&nbsp;SG-01-2-017</option>    <option value="Fazb">&nbsp;&nbsp;&nbsp;SG-05-1-015A</option>    <option value="Faza">&nbsp;&nbsp;&nbsp;SG-06-1-01</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Taastrup</option>    <option value="Fqzd">&nbsp;&nbsp;&nbsp;TAAS-01-0</option>    <option value="Fq3e">&nbsp;&nbsp;&nbsp;TAAS-01-1</option>    <option value="Fqzc">&nbsp;&nbsp;&nbsp;TAAS-57-17</option>    <option value="FqzT">&nbsp;&nbsp;&nbsp;TAAS-60</option>    <option value="Fq3c">&nbsp;&nbsp;&nbsp;TAAS-61</option>    <option value="FqzS">&nbsp;&nbsp;&nbsp;TAAS-64-G17</option>    <option value="Fq3b">&nbsp;&nbsp;&nbsp;TAAS-64-G29</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Tagensvej 16</option>    <option value="FazS">&nbsp;&nbsp;&nbsp;TV16-1-0-05A</option>    <option value="Fa3b">&nbsp;&nbsp;&nbsp;TV16-1-0-05A-B</option>    <option value="Fa3a">&nbsp;&nbsp;&nbsp;TV16-1-0-05B</option>    <option value="Fa3Z">&nbsp;&nbsp;&nbsp;TV16-1-01-K05A</option>    <option value="Fa3Y">&nbsp;&nbsp;&nbsp;TV16-1-1-104</option>    <option value="Fa3f">&nbsp;&nbsp;&nbsp;TV16-1-1-104-B</option>    <option value="Fa3e">&nbsp;&nbsp;&nbsp;TV16-1-1-105B</option>    <option value="Fa3d">&nbsp;&nbsp;&nbsp;TV16-1-1-105B-B</option>    <option value="Fa3c">&nbsp;&nbsp;&nbsp;TV16-1-2-212A</option>    <option value="Fa3T">&nbsp;&nbsp;&nbsp;TV16-1-3-305A</option>    <option value="Fa3S">&nbsp;&nbsp;&nbsp;TV16-1-3-305A-B</option>    <option value="Farb">&nbsp;&nbsp;&nbsp;TV16-2-0-24</option>    <option value="Fara">&nbsp;&nbsp;&nbsp;TV16-2-0-5</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Universitetsparken 1</option>    <option value="FQ==">&nbsp;&nbsp;&nbsp;UP1-2-1-02</option>    <option value="Fg==">&nbsp;&nbsp;&nbsp;UP1-2-1-02-b</option>    <option value="FarZ">&nbsp;&nbsp;&nbsp;UP1-3-01-20</option>    <option value="FarY">&nbsp;&nbsp;&nbsp;UP1-3-01-26</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Universitetsparken 13</option>    <option value="Farf">&nbsp;&nbsp;&nbsp;UP13-1-0-094</option>    <option value="FqjT">&nbsp;&nbsp;&nbsp;UP13-1-0-098F</option>    <option value="Fqnb">&nbsp;&nbsp;&nbsp;UP13-1-0-098F-B</option>    <option value="Fare">&nbsp;&nbsp;&nbsp;UP13-1-1-165</option>    <option value="Fard">&nbsp;&nbsp;&nbsp;UP13-1-1-177</option>    <option value="Farc">&nbsp;&nbsp;&nbsp;UP13-1-1-177A</option>    <option value="FarT">&nbsp;&nbsp;&nbsp;UP13-1-1-177B</option>    <option value="FarS">&nbsp;&nbsp;&nbsp;UP13-1-1-177B-B</option>    <option value="Favb">&nbsp;&nbsp;&nbsp;UP13-1-1-180</option>    <op-180-B</option>    <option value="Fqjd">&nbsp;&nbsp;&nbsp;UP13-1-2-G1</option>    <option value="Favf">&nbsp;&nbsp;&nbsp;UP13-1-3-326</option>    <option value="Fave">&nbsp;&nbsp;&nbsp;UP13-1-3-329</option>    <option value="Favd">&nbsp;&nbsp;&nbsp;UP13-1-3-335</option>    <option value="Favc">&nbsp;&nbsp;&nbsp;UP13-1-3-G2</option>    <option value="FavT">&nbsp;&nbsp;&nbsp;UP13-1-4-434</option>    <option value="FavS">&nbsp;&nbsp;&nbsp;UP13-1-4-445</option>    <option value="Fajb">&nbsp;&nbsp;&nbsp;UP13-1-5-507</option>    <option value="Fq7e">&nbsp;&nbsp;&nbsp;UP13-1-6-649</option>    <option value="Fq7d">&nbsp;&nbsp;&nbsp;UP13-1-6-663</option>    <option value="Faja">&nbsp;&nbsp;&nbsp;UP13-2-0-06</option>    <option value="FajZ">&nbsp;&nbsp;&nbsp;UP13-2-0-06-B</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Universitetsparken 15</option>    <option value="FajY">&nbsp;&nbsp;&nbsp;UP15-1-0-119</option>    <option value="Fw==">&nbsp;&nbsp;&nbsp;UP15-1-0-125</option>    <option value="EA==">&nbsp;&nbsp;&nbsp;UP15-1-1-205-b</option>    <option value="Fajf">&nbsp;&nbsp;&nbsp;UP15-1-2-307</option>    <option value="Faje">&nbsp;&nbsp;&nbsp;UP15-1-2-307-B</option>    <option value="Fajd">&nbsp;&nbsp;&nbsp;UP15-1-2-322</option>    <option value="FanT">&nbsp;&nbsp;&nbsp;UP15-2-0-056</option>    <option value="FanS">&nbsp;&nbsp;&nbsp;UP15-2-0-056B</option>    <option value="Fajc">&nbsp;&nbsp;&nbsp;UP15-2-1-100C</option>    <option value="FajT">&nbsp;&nbsp;&nbsp;UP15-2-1-115</option>    <option value="FajS">&nbsp;&nbsp;&nbsp;UP15-2-1-182</option>    <option value="Fanb">&nbsp;&nbsp;&nbsp;UP15-2-1-185</option>    <option value="Fana">&nbsp;&nbsp;&nbsp;UP15-2-2-200A</option>    <option value="FanZ">&nbsp;&nbsp;&nbsp;UP15-2-2-200C</option>    <option value="FanY">&nbsp;&nbsp;&nbsp;UP15-2-3-300A</option>    <option value="Fanf">&nbsp;&nbsp;&nbsp;UP15-2-3-300C</option>    <option value="Fane">&nbsp;&nbsp;&nbsp;UP15-2-4-400A</option>    <option value="Fand">&nbsp;&nbsp;&nbsp;UP15-2-4-400C</option>    <option value="Fq7T">&nbsp;&nbsp;&nbsp;UP15-2-5-558-C</option>    <option value="Fabb">&nbsp;&nbsp;&nbsp;UP15-2-5-558-b</option>    <option value="Faba">&nbsp;&nbsp;&nbsp;UP15-3-1-210</option>    <option value="FabZ">&nbsp;&nbsp;&nbsp;UP15-3-2-328</option>    <option value="FqnZ">&nbsp;&nbsp;&nbsp;UP15-3-3-439</option>    <option value="FqnY">&nbsp;&nbsp;&nbsp;UP15-3-4-529</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Universitetsparken 4</option>    <option value="FabY">&nbsp;&nbsp;&nbsp;UP4-20-1-113C</option>    <option value="Fabf">&nbsp;&nbsp;&nbsp;UP4-20-1-113C-B</option>    <option value="Fabe">&nbsp;&nbsp;&nbsp;UP4-20-3-311B</option>    <option value="Fabd">&nbsp;&nbsp;&nbsp;UP4-20-3-311C</option>    <option value="Fabc">&nbsp;&nbsp;&nbsp;UP4-20-3-313A</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Øster Farimagsgade</option>    <option value="Hag=">&nbsp;&nbsp;&nbsp;OF-01-0-004</option>    <option value="Hak=">&nbsp;&nbsp;&nbsp;OF-05-2-022-A</option>    <option value="HaY=">&nbsp;&nbsp;&nbsp;OF-05-2-022-B</option>    <option value="Hac=">&nbsp;&nbsp;&nbsp;OF-05-3-001</option>    <option value="Fa7b">&nbsp;&nbsp;&nbsp;OF-10-0-G5</option>    <option value="Fa7a">&nbsp;&nbsp;&nbsp;OF-11-0-06</option>    <option value="Fa7Z">&nbsp;&nbsp;&nbsp;OF-11-1-003</option>    <option value="Fa7Y">&nbsp;&nbsp;&nbsp;OF-11-1-01</option>    <option value="">&nbsp;&nbsp;&nbsp;</option>    <option value="">Øster Voldgade</option>    <option value="Fq7Z">&nbsp;&nbsp;&nbsp;FollowMe-OV10-Ricoh-staff</option>    <option value="Fa7f">&nbsp;&nbsp;&nbsp;OV10-6-01-611A</option>    <option value="Fa7e">&nbsp;&nbsp;&nbsp;OV3-01-0-134</option>    <option value="Fa7d">&nbsp;&nbsp;&nbsp;OV3-01-1-233</option>    <option value="Fa7T">&nbsp;&nbsp;&nbsp;OV5-01-0-133</option>    <option value="Fa/b">&nbsp;&nbsp;&nbsp;OV5-01-0-208</option>    <option value="Fa/a">&nbsp;&nbsp;&nbsp;OV5-01-0-208-b</option>    <option value="Fa7c">&nbsp;&nbsp;&nbsp;OV5-01-01-128</option>    <option va="Fa/Z">&nbsp;&nbsp;&nbsp;OV5-02-0-G1</option>    <option value="Fa/Y">&nbsp;&nbsp;&nbsp;OV5-02-1-531</option>    <option value="Fa/e">&nbsp;&nbsp;&nbsp;OV5-03-0-G1</option>    <option value="Fa/f">&nbsp;&nbsp;&nbsp;OV5-03-01-TR1</option>    <option value="Fa/d">&nbsp;&nbsp;&nbsp;OV5-03-1-G1</option>    <option value="Fqvb">&nbsp;&nbsp;&nbsp;OV5-03-1-G1-B</option>   <option value="">&nbsp;&nbsp;&nbsp;</option>    </select>');

