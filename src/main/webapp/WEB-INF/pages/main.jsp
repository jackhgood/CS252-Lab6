<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://www.springframework.org/tags" prefix="spring" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ page language="java" pageEncoding="UTF-8" session="false"%>
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Gateway</title>

    <link rel="stylesheet" href="<c:url value="/css/main.css" />" />
</head>
<body>

<h2>Gateway</h2>
<a href="<c:url value="/play" />">play</a>

<spring:url value="/j_spring_openid_security_check" var="form_url_openid" />
<form action="${fn:escapeXml(form_url_openid)}" id="google-login-form" method="post">
	<input name="openid_identifier" size="50"
		   maxlength="100" type="hidden"
		   value="http://www.google.com/accounts/o8/id"/>
	<label class="fixed"><!-- intentionally left blank --></label>
	<div class="input">
		<input id="proceed-google" type="submit" value="Do it with Google" />
	</div>
</form>

</body>
</html>