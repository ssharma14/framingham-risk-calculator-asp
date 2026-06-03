//risk percentage
var cvdRiskTable = [['LT1', 'LT1'], [1.1, 'LT1'], [1.4, 1.0], [1.6, 1.2], [1.9, 1.5], [2.3, 1.7], [2.8, 2.0], [3.3, 2.3], [3.9, 2.8], [4.7, 3.3], [5.6, 3.9], [6.7, 4.5], [7.9, 5.3], [9.4, 6.3], [11.2, 7.3], [13.3, 8.6], [15.6, 10.0], [18.4, 11.7], [21.6, 13.7], [25.3, 15.9], [29.4, 18.51], ['GT30', 21.5], ['GT30', 24.8], ['GT30', 27.5], ['GT30', 'GT30']]; // male, female - starts at -3

//heart age in years
var heartAgeTable = [['LT30', 'LT30'], [30, 'LT30'], [32, 31], [34, 34], [36, 36], [38, 39], [40, 42], [42, 45], [45, 48], [48, 51], [51, 55], [54, 59], [57, 64], [60, 68], [64, 73], [68, 79], [72, 'GT80'], [76, 'GT80'], ['GT80', 'GT80']]; // male, female - starts at -1

var age_now = 0.0;
var gender = "";
var treated_bp;
var systolic;
var total_chol;
var hdl;
var smoking;
var isdiabetic;

var score = 0; //total points

var risk;
var heartage;

function OnPageLoad() {
    age_now = parseFloat(document.getElementById("cAge").value);
    if (age_now < 30) {
        alert("Your patient age is" + age_now + " years. Framingham risk calculator is only applicable for patients of age 30 years and above.");
        document.querySelector("#cSystolic").disabled = true;
        document.querySelector("#cCholesterol").disabled = true;
        document.querySelector("#cHDL").disabled = true;
        document.querySelector("#cal").disabled = true;
    }
    else {
        document.querySelector("#cSystolic").disabled = false;
        document.querySelector("#cCholesterol").disabled = false;
        document.querySelector("#cHDL").disabled = false;
        document.querySelector("#cal").disabled = false;
    }
    
}

function testCalculation() {
    age_now = parseFloat(document.getElementById("cAge").value);
    //alert("age: " + age_now);
    gender = (document.getElementById("cMale").checked) ? true : false;
    treated_bp = (document.getElementById("cTreated").checked) ? true : false;
    systolic = parseFloat(document.getElementById("cSystolic").value);
    total_chol = parseFloat(document.getElementById("cCholesterol").value);
    hdl = parseFloat(document.getElementById("cHDL").value);
    smoking = (document.getElementById("cCurSmoker").checked) ? true : false;
    isdiabetic = (document.getElementById("isDiabetesY").checked) ? true : false;

    score = 0; //total points

    risk; //risk percentage
    heartage; //heart age in years 

    calculateRisk(); //for calculating total points
    getCvdRisk(score, gender) //for calculating risk percentage

    getRiskLevel(risk) //for calculating level of risk ie, low,moderate,high
    riskLevel = getRiskLevel(risk);

    getHeartAge(score, gender); //for calculating heart age

    validation();
}

function calculateRisk() {
    score = getAgeScore(age_now, gender);
    score += getTtlCholesterolScore(total_chol, gender);
    score += getTtlHdlScore(hdl);
    score += getBloodPressureScore(systolic, gender, treated_bp);
    score += isSmoking(smoking, gender);
    score += isPatientDiabetic(isdiabetic, gender)
}

function getAgeScore(age_now, gender) {

    if (age_now >= 30 && age_now <= 34) {
        return 0;
    }

    if (age_now >= 35 && age_now <= 39) {
        return 2;
    }

    if (age_now >= 40 && age_now <= 44) {
        return (gender == 1) ? 5 : 4;
    }

    if (age_now >= 45 && age_now <= 49) {
        return (gender == 1) ? 7 : 5;
    }

    if (age_now >= 50 && age_now <= 54) {
        return (gender == 1) ? 8 : 7;
    }

    if (age_now >= 55 && age_now <= 59) {
        return (gender == 1) ? 10 : 8;
    }

    if (age_now >= 60 && age_now <= 64) {
        return (gender == 1) ? 11 : 9;
    }

    if (age_now >= 65 && age_now <= 69) {
        return (gender == 1) ? 13 : 10;
    }

    if (age_now >= 70 && age_now <= 74) {
        return (gender == 1) ? 14 : 11;
    }

    if (age_now >= 75) {
        return (gender == 1) ? 15 : 12;
    }
}


function getTtlCholesterolScore(total_chol, gender) {
    if (total_chol < 4.1) {
        return 0;
    }

    if (total_chol >= 4.1 && total_chol < 5.2) {
        return 1;
    }

    if (total_chol >= 5.2 && total_chol < 6.2) {
        return (gender == 1) ? 2 : 3;
    }

    if (total_chol >= 6.2 && total_chol <= 7.2) {
        return (gender == 1) ? 3 : 4;
    }

    if (total_chol > 7.2) {
        return (gender == 1) ? 4 : 5;
    }
}


function getTtlHdlScore(hdl) {
    if (hdl < 0.9) {
        return 2;
    }

    if (hdl >= 0.9 && hdl <= 1.19) {
        return 1;
    }

    if (hdl >= 1.2 && hdl <= 1.29) {
        return 0;
    }

    if (hdl >= 1.3 && hdl <= 1.6) {
        return -1;
    }

    if (hdl > 1.6) {
        return -2;
    }
}

function getBloodPressureScore(systolic, gender, treated_bp) {
    if (systolic < 120) {
        if (gender == 1) {
            return (treated_bp) ? 0 : -2;
        }
        else {
            return (treated_bp) ? -1 : -3;
        }
    }

    if (systolic >= 120 && systolic <= 129) {
        return (treated_bp) ? 2 : 0;
    }

    if (systolic >= 130 && systolic <= 139) {
        return (treated_bp) ? 3 : 1;
    }

    if (systolic >= 140 && systolic <= 149) {
        if (gender == 1) {
            return (treated_bp) ? 4 : 2;
        }
        else {
            return (treated_bp) ? 5 : 2;
        }
    }

    if (systolic >= 150 && systolic <= 159) {
        if (gender == 1) {
            return (treated_bp) ? 4 : 2;
        }
        else {
            return (treated_bp) ? 6 : 4;
        }
    }

    if (systolic >= 160) {
        if (gender == 1) {
            return (treated_bp) ? 5 : 3;
        }
        else {
            return (treated_bp) ? 7 : 5;
        }
    }
}

function isSmoking(smoking, gender) {
    if (smoking == 1) {
        if (gender == 1) {
            return 4;
        }
        else {
            return 3;
        }
    }
    else {
        return 0;
    }
}

function isPatientDiabetic(isdiabetic, gender) {
    if (isdiabetic == 1) {
        if (gender == 1) {
            return 3;
        }
        else {
            return 4;
        }
    }
    else {
        return 0;
    }
}

function getCvdRisk(score, gender) {
    var i = 0; //for getting index of risk and heart table
    var j = (gender == 1) ? 0 : 1;

    // translate score to index. Basically we are getting values from cvdRiskTable
    if (score > -3 && score <= 21) {
        i = score + 3;

    }
    else if (score > 21) {
        i = 24;
    }
    risk = cvdRiskTable[i][j];
    if (isNaN(risk)) {
        risk = risk.replace('LT', '&lt;');
        risk = risk.replace('GT', '&gt;');
    }

    return risk;
}

function getRiskLevel(risk) {
    if (isNaN(score)) {
        document.getElementById('low-risk').style.display = 'none';
        document.getElementById('high-risk').style.display = 'none';
        document.getElementById('moderate-risk').style.display = 'none';
    }
    else {
        if (isNaN(risk) && risk.length != 0) {
            risk = risk.substring(4);
        }
        if (risk < 10 && risk.length != 0) {
            document.getElementById('low-risk').style.display = 'inline-block';
            document.getElementById('high-risk').style.display = 'none';
            document.getElementById('moderate-risk').style.display = 'none';
            return 'Low Risk';
        }
        else if (risk >= 20 && risk.length != 0) {
            document.getElementById('high-risk').style.display = 'inline-block';
            document.getElementById('low-risk').style.display = 'none';
            document.getElementById('moderate-risk').style.display = 'none';
            return 'High Risk';
        }
        else if (risk.length != 0) {
            document.getElementById('moderate-risk').style.display = 'inline-block';
            document.getElementById('high-risk').style.display = 'none';
            document.getElementById('low-risk').style.display = 'none';
            return 'Moderate Risk';
        }
    }
}

function getHeartAge(score, gender) {
    var i = 0;
    var j = (gender == 1) ? 0 : 1;

    // translate score to index. getting heart age from heartAgeTable
    if (score > -1 && score <= 17) {
        i = score + 1;
    }
    else if (score > 17) {
        i = 18;
    }

    heartage = heartAgeTable[i][j]
    if (isNaN(heartage)) {
        heartage = heartage.replace('LT', '&lt;');
        heartage = heartage.replace('GT', '&gt;');
    }
    return heartage;
};

function validation() {
    var systolicBp = document.getElementById("cSystolic").value;
    var tchol = document.getElementById("cCholesterol").value;
    var chdl = document.getElementById("cHDL").value;
    var age = document.getElementById("cAge").value;
    if (systolicBp.length == 0 || tchol.length == 0 || chdl.length == 0 || age.length == 0) {
        alert("please fill on all the information correctly");
        ageValidation();
        hdlValidation();
        tlchlValidation();
        bpValidation();
    }
    else {
        var score1 = Object();
        document.getElementById("total_points").innerHTML = 'Total Score: ' +  score + ' points';
        document.getElementById("result_value").innerHTML = 'Risk: ' + risk + '%';
        document.getElementById("heart_age").innerHTML = 'HeartAge: ' + heartage + ' years';
        document.getElementById("risk_level").innerHTML = riskLevel;
        score1.Framingham_Total_points = parseInt(document.getElementById("total_points").innerHTML);
        score1.Framingham_Risk_percentage = document.getElementById("result_value").innerHTML;
        score1.Heart_age_in_years = document.getElementById("heart_age").innerHTML;
        score1.Risk_level = document.getElementById("risk_level").innerHTML
        
    }
}

function ageValidation() {
    var age = document.getElementById("cAge").value;
    var error = document.getElementById("age_error");
    if(age.length == 0) {
        error.innerHTML = "*This field is required";
        document.querySelector("#cAge").style.border = "2px solid #ff7373";
        document.querySelector("#cAge").focus();
    }
    else {
        error.innerHTML = "";
        document.querySelector("#cAge").style.border = "1px solid #5c4d46";
    }
};


function bpValidation() {
    var bp = document.getElementById("cSystolic").value;
    var error = document.getElementById("bp_error");
    if (bp.length == 0) {
        error.innerHTML = "*This field is required";
        document.querySelector("#cSystolic").style.border = "2px solid #ff7373";
        document.querySelector("#cSystolic").focus();
    }
    else if (Number(bp) < 10) {
        error.innerHTML = "*Enter a value greater than or equal to 10";
        document.querySelector("#cSystolic").style.border = "2px solid #ff7373";
        document.querySelector("#cSystolic").focus();
    }
    else {
        error.innerHTML = "";
        document.querySelector("#cSystolic").style.border = "1px solid #5c4d46";
    }
};

function tlchlValidation() {
    var tlchol = document.getElementById("cCholesterol").value;
    var error = document.getElementById("chl_error");
    if (tlchol.length == 0) {
        error.innerHTML = "*This field is required";
        document.querySelector("#cCholesterol").style.border = "2px solid #ff7373";
        document.querySelector("#cCholesterol").focus();
    }
    else if (Number(tlchol) < 0) {
        error.innerHTML = "*Please enter a value greater than or equal to 0.";
        document.querySelector("#cCholesterol").style.border = "2px solid #ff7373";
        document.querySelector("#cCholesterol").focus();
    }
    else {
        error.innerHTML = "";
        document.querySelector("#cCholesterol").style.border = "1px solid #5c4d46";
    }
};

function hdlValidation() {
    var chdl = document.getElementById("cHDL").value;
    var error = document.getElementById("hdl_error");
    if (chdl.length == 0) {
        error.innerHTML = "*This field is required";
        document.querySelector("#cHDL").style.border = "2px solid #ff7373";
        document.querySelector("#cHDL").focus();
    }
    else if (Number(chdl) < 0) {
        error.innerHTML = "*Please enter a value greater than or equal to 0.";
        document.querySelector("#cHDL").style.border = "2px solid #ff7373";
        document.querySelector("#cHDL").focus();
    }
    else {
        error.innerHTML = "";
        document.querySelector("#cHDL").style.border = "1px solid #5c4d46";
    }
};
