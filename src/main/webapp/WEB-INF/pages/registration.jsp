<!DOCTYPE HTML>
<html xmlns:th="http://www.thymeleaf.org">

<head>
    <title>Registration Page</title>
</head>
<body onload='document.g.username.focus();'>
    <h3>Register an Account</h3>
    <form name='g' action='#' th:action="@{/register}" th:object="${registrationform}" method='POST'>
        <table>
            <tr><td>Username:</td><td><input type='text' name='username' value='' th:field="*{username}"></td></tr>
            <tr><td>Password:</td><td><input type='password' name='password' th:field="*{password}"/></td></tr>
            <tr><td>Retype Password:</td><td><input type = 'password' name = 'password2' th:field="*{password2}" /></td></tr>
            <tr><td colspan='2'><input name="submit" type="submit" value="Register"/></td></tr>
            <input name="${_csrf.parameterName}" type="hidden" value="${_csrf.token}" />
        </table>
    </form>
</body>

</html>