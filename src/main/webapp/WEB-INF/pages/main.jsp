<%@ taglib uri="http://java.sun.com/jsp/jstl/core" prefix="c" %>
<%@ taglib uri="http://www.springframework.org/tags" prefix="spring" %>
<%@ taglib uri="http://java.sun.com/jsp/jstl/functions" prefix="fn" %>
<%@ taglib prefix="sec" uri="http://www.springframework.org/security/tags" %>
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
<button onclick="window.location.href='<c:url value="/play" />'">Play!</button>
<sec:authorize access="not hasAuthority('ROLE_USER')">
    <button onclick="window.location.href='<c:url value="/login" />'">Login</button>
</sec:authorize>
<sec:authorize access="hasAuthority('ROLE_USER')">
    <button onclick="window.location.href='<c:url value="/logout?${_csrf.parameterName}=${_csrf.token}" />'">Logout</button>
</sec:authorize>

</body>
</html>